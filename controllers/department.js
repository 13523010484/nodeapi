const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const stream = require('stream');
const path = require('path');
const fs = require('fs');
const { Department } = require('../model/department');
const { rightAdd } = require('./right');
const { rightMappingAdd } = require('./rightMapping');
const { getNextSequenceValue } = require('../utils/sequence');
const { Right } = require('../model/right');
const { RightMapping } = require('../model/rightMapping');
const { User } = require('../model/user');
const { getUserInfo } = require('./user');
const { getCurrentFormattedDateTime } = require('../utils/utils');

logger.info('应用启动...');

// 部门新增
const add = async (ctx) => {
  const token = ctx.request.headers.authorization?.split(' ')[1];
  const body = ctx.request.body;

  try {
    // 获取下一个自增ID
    const deptId = await getNextSequenceValue('deptId');
    const { operName } = await getUserInfo(token);

    // 创建新的部门记录
    const newDepartment = new Department({
      ...body,
      deptId,
      deptStatus: 1,
      inputOperName: operName,
      inputTime: new Date(), // 设置录入时间为当前时间
      updateTime: new Date(), // 设置更新时间为当前时间
    });

    // 保存部门记录
    await newDepartment.save();

    // 插入关联的 authRight 权限数据
    if (body.authRight && body.authRight.length > 0) {
      // 生成一条授权权限数据
      const authRightRecord = await rightAdd(ctx, {
        rightType: 1, // 部门权限
        authId: deptId, // 使用新生成的部门ID
        authRightFlag: 1, // 授权权限标志位
        reviewRightFlag: 0, // 操作权限标志位
      });

      // 插入权限映射表数据
      await rightMappingAdd(authRightRecord.rightId, body.authRight);
    }

    // 插入关联的 reviewRight 权限数据
    if (body.reviewRight && body.reviewRight.length > 0) {
      // 生成一条操作权限数据
      const reviewRightRecord = await rightAdd(ctx, {
        rightType: 1,
        authId: deptId, // 使用新生成的部门ID
        authRightFlag: 0, // 授权权限标志位
        reviewRightFlag: 1, // 操作权限标志位
      });

      // 插入权限映射表数据
      await rightMappingAdd(reviewRightRecord.rightId, body.reviewRight);
    }

    ctx.body = {
      status: 200,
      msg: '保存成功',
    };
  } catch (err) {
    console.error('Error saving department:', err);
    ctx.body = {
      status: 500,
      msg: '保存失败',
      error: err.message,
    };
  }
};

// 部门查询
const query = async (ctx) => {
  const { deptName, memCode, deptStatus, pageSize, pageNum } = ctx.request.body;

  // 构建查询条件对象
  const queryConditions = {
    deptStatus: 1,
  };

  if (deptName && deptName.length) {
    queryConditions.deptName = { $regex: new RegExp(deptName, 'i') };
  }

  if (memCode && memCode.length) {
    queryConditions.memCode = {
      $in: memCode,
    };
  }

  if (deptStatus && deptStatus.length) {
    queryConditions.deptStatus = {
      $in: deptStatus,
    };
  }

  try {
    // 同时进行分页查询和总数统计，根据查询条件
    const [docs, total] = await Promise.all([
      Department.find(queryConditions)
        .limit(pageSize)
        .skip(pageSize * (pageNum - 1))
        .exec(), // 根据查询条件执行查询并返回结果
      Department.countDocuments(queryConditions).exec(), // 根据查询条件执行计数并返回总数
    ]);

    // 格式化返回结果
    ctx.body = {
      status: 200,
      msg: '查询成功',
      data: {
        rows: docs,
        total,
      },
    };
  } catch (err) {
    // 发生错误时返回500状态码和错误信息
    ctx.body = {
      status: 500,
      msg: '查询失败',
      error: err.message, // 返回具体的错误信息，而不是整个Error对象
    };
  }
};

// 批量插入权限映射数据，支持重试机制
async function insertWithRetry(rights, rightId, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const insertData = rights.map(async (item) => ({
        ...item,
        rightId,
        id: await getNextSequenceValue('id'),
      }));

      // 等待所有 id 生成完成
      const resolvedInsertData = await Promise.all(insertData);

      await RightMapping.insertMany(resolvedInsertData);
      console.log(
        `插入权限映射记录成功: 共插入 ${resolvedInsertData.length} 条记录 (rightId: ${rightId})`
      );
      return;
    } catch (error) {
      if (error.code === 11000) {
        retries++;
        console.warn(`插入失败，尝试重试 (${retries}/${maxRetries})...`);
      } else {
        throw error; // 抛出非重复键错误
      }
    }
  }

  throw new Error('多次重试后仍无法插入数据');
}

// 部门修改
const update = async (ctx) => {
  const token = ctx.request.headers.authorization?.split(' ')[1];
  const body = ctx.request.body;

  try {
    const { deptId, deptName, remark, authRight, reviewRight } = body;

    // 检查部门是否存在
    const department = await Department.find({ deptId });
    if (!department.length) {
      return (ctx.body = {
        status: 404,
        msg: '部门不存在',
      });
    }

    // 获取当前操作用户信息
    const { operName } = await getUserInfo(token);

    // 更新部门基本信息
    const updatedDepartment = await Department.findOneAndUpdate(
      { deptId },
      {
        deptName,
        remark,
        updateTime: new Date(),
        inputOperName: operName,
      },
      { new: true }
    );

    if (!updatedDepartment) {
      return (ctx.body = {
        status: 202,
        msg: '修改失败',
      });
    }

    // 验证 reviewRight 参数
    if (!reviewRight) {
      return (ctx.body = {
        status: 401,
        msg: '操作权限为必传字段',
      });
    }

    if (!reviewRight.length) {
      return (ctx.body = {
        status: 402,
        msg: '操作权限不能为空',
      });
    }

    // 查询关联的操作权限记录
    const reviewRightRecord = await Right.findOne({
      rightType: 1,
      authId: deptId,
      reviewRightFlag: 1,
    });

    if (!reviewRightRecord) {
      console.warn(`未找到对应的操作权限记录 (deptId: ${deptId})`);
      throw new Error('未找到操作权限记录');
    }

    // 删除权限映射表中旧的数据
    await RightMapping.deleteMany({ rightId: reviewRightRecord.rightId });

    // 批量插入新的操作权限数据
    await insertWithRetry(reviewRight, reviewRightRecord.rightId);

    // 验证 authRight 参数
    if (!authRight) {
      return (ctx.body = {
        status: 401,
        msg: '授权权限为必传字段',
      });
    }

    if (!authRight.length) {
      return (ctx.body = {
        status: 402,
        msg: '授权权限不能为空',
      });
    }

    // 查询关联的授权权限记录
    const authRightRecord = await Right.findOne({
      rightType: 1,
      authId: deptId,
      authRightFlag: 1,
    });

    if (!authRightRecord) {
      console.warn(`未找到对应的授权权限记录 (deptId: ${deptId})`);
      throw new Error('未找到授权权限记录');
    }

    // 删除权限映射表中旧的数据
    await RightMapping.deleteMany({ rightId: authRightRecord.rightId });

    // 批量插入新的授权权限数据
    await insertWithRetry(authRight, authRightRecord.rightId);

    ctx.body = {
      status: 200,
      msg: '修改成功',
    };
  } catch (err) {
    console.error('Error updating department:', err);
    ctx.body = {
      status: 500,
      msg: '修改失败',
      error: err.message,
    };
  }
};

// 部门删除（软删除）
const remove = async (ctx) => {
  const { deptId } = ctx.request.body;

  // 验证 deptId 是否存在
  if (!deptId) {
    ctx.status = 400; // 返回 HTTP 400 状态码
    ctx.body = { error: '部门 ID 不能为空' };
    return;
  }

  // 检查部门是否存在
  const department = await Department.findOne({ deptId });
  console.log('department::', department);
  if (!department) {
    ctx.status = 404; // 返回 HTTP 404 状态码
    ctx.body = { error: '部门不存在' };
    return;
  }

  try {
    // 更新部门状态
    await Department.findOneAndUpdate(
      { deptId },
      {
        deptStatus: 0,
        updateTime: new Date(),
      }
    );

    ctx.body = {
      status: 200,
      msg: '删除成功。',
    };
  } catch (error) {
    ctx.status = 500; // 返回 HTTP 500 状态码
    ctx.body = { error: '删除部门时发生错误', details: error.message };
  }
};

const detail = async (ctx) => {
  const { deptId } = ctx.query;

  if (!deptId) {
    ctx.body = {
      status: 400,
      msg: '缺少 deptId 参数',
    };
    return;
  }

  try {
    const pipeline = [
      {
        $match: { deptId: parseInt(deptId) },
      },
      {
        $lookup: {
          from: 'rights',
          let: { deptId: '$deptId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$authId', '$$deptId'] },
                rightType: 1,
              },
            },
            {
              $facet: {
                authRights: [
                  { $match: { authRightFlag: 1 } },
                  {
                    $lookup: {
                      from: 'rightMappings',
                      localField: 'rightId',
                      foreignField: 'rightId',
                      as: 'mapping',
                    },
                  },
                  { $unwind: '$mapping' },
                  {
                    $project: {
                      _id: 0,
                      id: '$mapping.id',
                      btnId: '$mapping.btnId',
                      menuId: '$mapping.menuId',
                    },
                  },
                  {
                    $lookup: {
                      from: 'menuBtns',
                      localField: 'btnId',
                      foreignField: 'btnId',
                      as: 'btnInfo',
                    },
                  },
                  { $unwind: '$btnInfo' },
                  {
                    $project: {
                      id: 1,
                      btnId: 1,
                      btnCode: '$btnInfo.btnCode',
                      menuId: 1,
                    },
                  },
                ],
                reviewRights: [
                  { $match: { reviewRightFlag: 1 } },
                  {
                    $lookup: {
                      from: 'rightMappings',
                      localField: 'rightId',
                      foreignField: 'rightId',
                      as: 'mapping',
                    },
                  },
                  { $unwind: '$mapping' },
                  {
                    $project: {
                      _id: 0,
                      id: '$mapping.id',
                      btnId: '$mapping.btnId',
                      menuId: '$mapping.menuId',
                    },
                  },
                  {
                    $lookup: {
                      from: 'menuBtns',
                      localField: 'btnId',
                      foreignField: 'btnId',
                      as: 'btnInfo',
                    },
                  },
                  { $unwind: '$btnInfo' },
                  {
                    $project: {
                      id: 1,
                      btnId: 1,
                      btnCode: '$btnInfo.btnCode',
                      menuId: 1,
                    },
                  },
                ],
              },
            },
          ],
          as: 'rights',
        },
      },
      // 提取需要的数据
      {
        $project: {
          deptId: 1,
          deptName: 1,
          remark: 1,
          authRight: { $arrayElemAt: ['$rights.authRights', 0] },
          reviewRight: { $arrayElemAt: ['$rights.reviewRights', 0] },
        },
      },
    ];

    const deptInfo = await Department.aggregate(pipeline);

    if (!deptInfo || deptInfo.length === 0) {
      ctx.body = {
        status: 404,
        msg: '未找到相关记录',
      };
      return;
    }

    // 格式化返回结果
    ctx.body = {
      status: 200,
      msg: '查询成功',
      data: {
        deptId: deptInfo[0].deptId,
        deptName: deptInfo[0].deptName,
        remark: deptInfo[0].remark,
        authRight: deptInfo[0].authRight || [],
        reviewRight: deptInfo[0].reviewRight || [],
      },
    };
  } catch (err) {
    // 发生错误时返回500状态码和错误信息
    ctx.body = {
      status: 500,
      msg: '查询失败',
      error: err.message, // 返回具体的错误信息，而不是整个Error对象
    };
  }
};

// 部门下载
const download = async (ctx, next) => {
  try {
    // 创建一个新的Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('部门管理');

    // 设置Excel的标题行
    worksheet.addRow([
      '部门编号',
      '部门名称',
      '所属机构',
      '备注',
      '部门状态',
      '录入人',
      '更新人',
      '更新时间',
      '复核人',
      '复核时间',
    ]);

    const data = await Department.find({ deptStatus: 1 }).exec();
    data.forEach((item) => {
      worksheet.addRow([
        item.deptId,
        item.deptName,
        item.memCode,
        item.remark,
        item.deptStatus,
        item.inputOperName,
        item.updateOperName,
        item.updateTm,
        item.reviewOperName,
        item.reviewTm,
      ]);
    });

    const timestamp = getCurrentFormattedDateTime();
    const fileName = `部门管理_${timestamp}.xlsx`.replace(/:/g, '-');
    ctx.set(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    ctx.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    const excelBuffer = await workbook.xlsx.writeBuffer();
    ctx.body = excelBuffer;
    await next();
  } catch (error) {
    console.error('下载失败:', error);
    ctx.status = 500;
    ctx.body = { message: '文件下载失败，请稍后再试！' };
  }
};

// 查询部门下的用户
const queryDeptUser = async (ctx) => {
  try {
    const {
      deptId,
      pageNum = 1,
      pageSize = 10,
      sortField = 'inputTm',
      sortOrder = 'asc',
    } = ctx.request.body;

    // 输入验证
    if (!deptId) {
      ctx.status = 400;
      ctx.body = { status: 400, msg: 'Department ID is required' };
      return;
    }

    console.log('deptId::', deptId);

    // 构建查询条件
    const query = { deptId };

    // 构建排序条件
    const sortOptions = {};
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    // 计算分页参数
    const skip = (pageNum - 1) * pageSize;

    // 查询用户数据
    const userResult = await User.find(query)
      .select({
        _id: 0,
        operId: 1,
        operCode: 1,
        operName: 1,
        operType: 1,
        operStatus: 1,
      }) // 排除敏感字段，如密码
      .skip(skip)
      .limit(pageSize)
      .sort(sortOptions)
      .lean();

    console.log('userResult::', userResult);

    // 获取总记录数
    const totalUsers = await User.countDocuments(query);

    ctx.body = {
      status: 200,
      msg: '成功',
      data: {
        total: totalUsers,
        size: Math.ceil(totalUsers / pageSize),
        currentPage: pageNum,
        rows: userResult,
      },
    };
  } catch (error) {
    console.error('Error occurred:', error);
    ctx.status = 500;
    ctx.body = {
      status: 500,
      msg: 'Internal Server Error',
      details: error.message,
    };
  }
};

// 查询部门名称数据
const deptName = async (ctx) => {
  try {
    const data = await Department.find({ deptStatus: 1 }).select({
      _id: 0,
      deptId: 1,
      deptName: 1,
    });
    // 格式化返回结果
    ctx.body = {
      status: 200,
      msg: '查询成功',
      data,
    };
  } catch (err) {
    // 发生错误时返回500状态码和错误信息
    ctx.body = {
      status: 500,
      msg: '查询失败',
      error: err.message, // 返回具体的错误信息，而不是整个Error对象
    };
  }
};

module.exports = {
  add,
  query,
  update,
  remove,
  detail,
  download,
  queryDeptUser,
  deptName,
};
