const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const fs = require('fs');
const XLSX = require('xlsx');
const { Post } = require('../model/post');
const { drrStatusMap, drrOperTypeMap } = require('./dic');
const { getNextSequenceValue } = require('../utils/sequence');
const { rightAdd } = require('./right');
const { rightMappingAdd } = require('./rightMapping');
const { getUserInfo } = require('./common');
const { Right } = require('../model/right');
const { RightMapping } = require('../model/rightMapping');
const { UserPost } = require('../model/userPost');
const { User } = require('../model/user');
const { getCurrentFormattedDateTime } = require('../utils/utils');
const { MenuBtn } = require('../model/menuBtn');
const { Menu } = require('../model/menu');

// 假设convertExcelDate是一个将Excel日期值转换为JavaScript Date对象的函数
function convertExcelDate(excelDateValue) {
  // Excel的基准日期是1899年12月30日，但需要注意1900年的闰年问题
  const startDate = new Date(Date.UTC(1899, 11, 30));

  // 调整时间以考虑Excel的日期系统（1900年被错误地当作闰年）
  let adjustedExcelDateValue = excelDateValue;
  if (excelDateValue > 59) {
    adjustedExcelDateValue -= 1; // 减去一天以纠正1900年的闰年错误
  }

  // 计算实际的日期和时间
  const date = new Date(
    startDate.getTime() + adjustedExcelDateValue * 86400 * 1000
  );

  // 格式化日期和时间
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份从0开始，所以需要+1
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  // 组合成 yyyy-mm-dd hh:mm:ss 格式
  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  return formattedDate;
}

// 申请岗位批量导入数据（从Excel文件）
const batchImport = async (ctx) => {
  try {
    if (!ctx.request.files || !ctx.request.files.file) {
      throw new Error('No file uploaded.');
    }

    const filePath = ctx.request.files.file.filepath;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // 假设我们处理第一个工作表
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
    }); // 假设第一行是标题行

    // 已经从Excel数据中获取了二维数组data
    const headers = data.shift(); // 移除第一行数据（表头），并获取它作为headers
    // 遍历剩余的数据行
    for (const record of data) {
      const postData = {};

      // 使用headers数组中的元素作为键，record数组中的元素作为值
      headers.forEach((header, index) => {
        if (
          header == 'drrDate' ||
          header == 'reviewTm' ||
          header == 'revokeTm'
        ) {
          postData[header] = convertExcelDate(record[index]);
        } else {
          postData[header] = record[index];
        }
      });

      // 假设您有一个postData模型，并且它有一个save方法
      const post = new Post(postData);
      await post.save(); // 保存数据到数据库
      // 在保存后，你可以通过post._id访问新生成的_id
      console.log(`Saved department application with _id: ${post._id}`);
    }

    ctx.body = { status: 'success', message: '岗位申请数据批量导入成功' };
  } catch (error) {
    console.error('Error during Excel batch import:', error);
    ctx.body = { status: 'error', message: '岗位数据批量导入时发生错误' };
    ctx.status = 500;
  }
};

// 岗位新增
const add = async (ctx) => {
  const body = ctx.request.body;

  try {
    const { deptId, operName } = await getUserInfo(ctx);
    const postId = await getNextSequenceValue('postId');
    // 创建新的岗位记录
    const newPost = new Post({
      ...body,
      deptId,
      postId,
      postStatus: 1,
      inputTime: new Date(),
      inputOperName: operName,
    });

    // 保存岗位记录
    await newPost.save();

    // 插入关联的 authRight 权限数据
    if (body.authRight && body.authRight.length > 0) {
      // 生成一条授权权限数据
      const authRightRecord = await rightAdd(ctx, {
        rightType: 2, // 岗位权限
        authId: postId, // 使用新生成的岗位ID
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
        rightType: 2,
        authId: postId, // 使用新生成的岗位ID
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
    console.error('Error saving post:', err);
    ctx.body = {
      status: 500,
      msg: '保存失败',
      error: err.message,
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

// 岗位修改
const update = async (ctx) => {
  const body = ctx.request.body;
  console.log('update body::', body);

  try {
    const { postId, postName, remark, authRight, reviewRight } = body;

    // 检查岗位是否存在
    const post = await Post.find({ postId });
    if (!post.length) {
      return (ctx.body = {
        status: 404,
        msg: '岗位不存在',
      });
    }

    // 获取当前操作用户信息
    const { operName } = await getUserInfo(ctx);

    // 更新岗位基本信息
    const updatedPost = await Post.findOneAndUpdate(
      { postId },
      {
        postName,
        remark,
        updateTime: new Date(),
        updateOperName: operName,
      },
      { new: true }
    );

    if (!updatedPost) {
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
      rightType: 2,
      authId: postId,
      reviewRightFlag: 1,
    });

    if (!reviewRightRecord) {
      console.warn(`未找到对应的操作权限记录 (postId: ${postId})`);
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
      rightType: 2,
      authId: postId,
      authRightFlag: 1,
    });

    if (!authRightRecord) {
      console.warn(`未找到对应的授权权限记录 (postId: ${postId})`);
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

// 岗位删除（软删除）
const remove = async (ctx) => {
  const { postId } = ctx.request.body;

  // 验证 postId 是否存在
  if (!postId) {
    ctx.status = 400; // 返回 HTTP 400 状态码
    ctx.body = { error: '岗位 ID 不能为空' };
    return;
  }

  // 检查岗位是否存在
  const post = await Post.findOne({ postId });
  console.log('post::', post);
  if (!post) {
    ctx.status = 404; // 返回 HTTP 404 状态码
    ctx.body = { error: '岗位不存在' };
    return;
  }

  try {
    // 更新岗位状态
    await Post.findOneAndUpdate(
      { postId },
      {
        postStatus: 0,
        updateTime: new Date(),
      }
    );

    ctx.body = {
      status: 200,
      msg: '删除成功。',
    };
  } catch (error) {
    ctx.status = 500; // 返回 HTTP 500 状态码
    ctx.body = { error: '删除岗位时发生错误', details: error.message };
  }
};

// 岗位申请查询：待复核 (1.待复核; 3.复核拒绝;4.已撤销)
const query = async (ctx) => {
  const { pageSize, pageNum } = ctx.request.body;

  try {
    // 同时进行分页查询和总数统计，根据查询条件
    let [docs, total] = await Promise.all([
      Post.find({ postStatus: 1 })
        .lean()
        .limit(pageSize)
        .skip(pageSize * (pageNum - 1))
        .exec(), // 根据查询条件执行查询并返回结果
      Post.countDocuments().exec(), // 根据查询条件执行计数并返回总数
    ]);

    // 遍历查询结果，将drrStatus的数字值替换为映射的描述
    docs = docs.map((doc) => {
      if (doc.drrStatus && drrStatusMap[doc.drrStatus]) {
        doc.drrStatusName = drrStatusMap[doc.drrStatus];
      }
      if (doc.drrOperType && drrOperTypeMap[doc.drrOperType]) {
        doc.drrOperTypeName = drrOperTypeMap[doc.drrOperType];
      }
      return doc;
    });

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

// 岗位申请查询：已复核(2.复核通过)
const reviewedQuery = async (ctx) => {
  const { pageSize, pageNum } = ctx.request.body;

  // 构建查询条件对象
  const queryConditions = {
    drrStatus: '2',
  };

  try {
    // 同时进行分页查询和总数统计，根据查询条件
    let [docs, total] = await Promise.all([
      Post.find(queryConditions)
        .lean()
        .limit(pageSize)
        .skip(pageSize * (pageNum - 1))
        .exec(), // 根据查询条件执行查询并返回结果
      Post.countDocuments(queryConditions).exec(), // 根据查询条件执行计数并返回总数
    ]);

    // 遍历查询结果，将drrStatus的数字值替换为映射的描述
    docs = docs.map((doc) => {
      if (doc.drrStatus && drrStatusMap[doc.drrStatus]) {
        doc.drrStatusName = drrStatusMap[doc.drrStatus];
      }
      if (doc.drrOperType && drrOperTypeMap[doc.drrOperType]) {
        doc.drrOperTypeName = drrOperTypeMap[doc.drrOperType];
      }
      return doc;
    });

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

// 岗位申请复核
const review = async (ctx) => {
  try {
    // 解构赋值直接从请求体中获取_id和drrStatus
    const { _id } = ctx.request.body;

    // 更新操作，这里不再硬编码drrStatus的值
    await Post.updateOne({ _id }, { drrStatus: '2' });
    ctx.body = {
      status: 200,
      msg: '复核成功',
    };
  } catch (error) {
    // 错误处理
    ctx.body = {
      status: 500,
      msg: '撤销失败',
    };
  }
};

// 岗位申请撤销
const revoke = async (ctx) => {
  try {
    // 解构赋值直接从请求体中获取_id和drrStatus
    const { _id } = ctx.request.body;
    console.log('撤销::===========================', _id);

    // 更新操作，这里不再硬编码drrStatus的值
    await Post.updateOne({ _id }, { drrStatus: '4' });
    ctx.body = {
      status: 200,
      msg: '撤销成功',
    };
  } catch (error) {
    // 错误处理
    ctx.body = {
      status: 500,
      msg: '撤销失败',
      error: err.message, // 返回具体的错误信息，而不是整个Error对象
    };
  }
};

// 岗位申请详情，根据id 查询详情
const detail = async (ctx) => {
  const { postId } = ctx.query;

  if (!postId) {
    ctx.body = {
      status: 400,
      msg: '缺少 postId 参数',
    };
    return;
  }

  try {
    // 使用聚合管道获取岗位信息及权限信息
    const pipeline = [
      // 匹配指定的 postId
      {
        $match: { postId: parseInt(postId) },
      },
      // 查找关联的权限信息
      {
        $lookup: {
          from: 'rights', // 权限集合名称，请根据实际情况调整
          let: { postId: '$postId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$authId', '$$postId'] },
                rightType: 2, // 增加 rightType 为 2 的过滤条件
              },
            },
            // 分离出 authRightFlag 和 reviewRightFlag 的记录
            {
              $facet: {
                authRights: [
                  { $match: { authRightFlag: 1 } },
                  {
                    $lookup: {
                      from: 'rightMappings', // 权限映射集合名称，请根据实际情况调整
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
                      from: 'menuBtns', // 按钮信息集合名称，请根据实际情况调整
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
                      btnCode: '$btnInfo.btnCode', // 新增 btnCode 字段
                      menuId: 1,
                    },
                  },
                ],
                reviewRights: [
                  { $match: { reviewRightFlag: 1 } },
                  {
                    $lookup: {
                      from: 'rightMappings', // 权限映射集合名称，请根据实际情况调整
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
                      from: 'menuBtns', // 按钮信息集合名称，请根据实际情况调整
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
                      btnCode: '$btnInfo.btnCode', // 新增 btnCode 字段
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
          postId: 1,
          postName: 1,
          remark: 1,
          authRight: { $arrayElemAt: ['$rights.authRights', 0] },
          reviewRight: { $arrayElemAt: ['$rights.reviewRights', 0] },
        },
      },
    ];

    const postInfo = await Post.aggregate(pipeline);

    if (!postInfo || postInfo.length === 0) {
      ctx.body = {
        status: 404,
        msg: '未找到相关记录',
      };
      return;
    }

    console.log('岗位信息 postInfo::', postInfo);

    // 格式化返回结果
    ctx.body = {
      status: 200,
      msg: '查询成功',
      data: {
        deptId: postInfo[0].deptId,
        postId: postInfo[0].postId,
        postName: postInfo[0].postName,
        remark: postInfo[0].remark,
        authRight: postInfo[0].authRight || [],
        reviewRight: postInfo[0].reviewRight || [],
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

// 岗位申请下载
const download = async (ctx, next) => {
  try {
    // 创建一个新的Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('岗位申请管理');

    // 设置Excel的标题行
    worksheet.addRow([
      '岗位 id',
      '岗位名称',
      '岗位状态',
      '备注',
      '录入人',
      '录入时间',
      '更新人',
      '更新时间',
    ]);

    // 查询数据库并将结果添加到Excel中
    const data = await Post.find({ postStatus: 1 }).exec();
    data.forEach((item) => {
      worksheet.addRow([
        item.postId,
        item.postName,
        item.postStatus,
        item.remark,
        item.inputOperName,
        item.inputTm,
        item.updateOperName,
        item.updateTm,
      ]);
    });

    const timestamp = getCurrentFormattedDateTime();
    const fileName = `岗位管理_${timestamp}.xlsx`.replace(/:/g, '-');
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

// 查询岗位名称
const postName = async (ctx) => {
  try {
    // 使用 await 等待异步操作完成
    const posts = await Post.find({ postStatus: 1 })
      .select({
        _id: 0,
        postId: 1,
        postName: 1,
      })
      .lean();

    ctx.body = {
      status: 200,
      msg: '查询成功',
      data: posts,
    };
  } catch (err) {
    // 发生错误时返回500状态码和错误信息
    ctx.body = {
      status: 500,
      msg: '查询失败',
      error: err.message || '未知错误', // 返回具体的错误信息，或默认信息
    };

    // 可以在这里添加额外的错误处理逻辑，如日志记录等
    console.error('查询过程中发生错误:', err);
  }
};

const permissionId = async (ctx) => {
  const { ids } = ctx.request.body;
  console.log('ids::', ids);
  const data = [];

  if (ids.includes('66715869f3089e9e858da9b3')) {
    data.push('department:query');
  }
  if (ids.includes('66715869f3089e9e858da9b5')) {
    data.push('department:add');
  }
  if (ids.includes('66715869f3089e9e858da9b7')) {
    data.push('departmentApplication:add');
  }
  if (ids.includes('66715869f3089e9e858da9b9')) {
    data.push('permissionManagement:position:query');
  }
  if (ids.includes('66715869f3089e9e858da9bb')) {
    data.push('userAdmin:add');
  }

  ctx.body = {
    status: 200,
    msg: '查询成功',
    data: data,
  };
};

// 查询当前岗位下的用户
const queryPostUser = async (ctx) => {
  try {
    const {
      postId,
      pageNum = 1,
      pageSize = 10,
      sortField = 'inputTm',
      sortOrder = 'asc',
    } = ctx.request.body;

    // 输入验证
    if (!postId) {
      ctx.status = 400;
      ctx.body = { status: 400, msg: 'Post ID is required' };
      return;
    }

    console.log('postId::', postId);

    // 构建排序条件
    const sortOptions = {};
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    // 计算分页参数
    const skip = (pageNum - 1) * pageSize;

    // 使用聚合管道查询
    const pipeline = [
      // 第一步：从 UserPost 集合中匹配 postId 并提取 operId
      {
        $match: { postId },
      },
      {
        $project: { operId: 1, _id: 0 },
      },

      // 第二步：与 User 集合进行 lookup（左连接），获取用户信息
      {
        $lookup: {
          from: 'users', // 替换为实际的 User 集合名称
          localField: 'operId',
          foreignField: 'operId',
          as: 'userDetails',
        },
      },

      // 第三步：解构 lookup 结果
      {
        $unwind: '$userDetails',
      },

      // 第四步：选择需要的字段
      {
        $project: {
          _id: 0,
          operId: '$userDetails.operId',
          operCode: '$userDetails.operCode',
          operName: '$userDetails.operName',
          operType: '$userDetails.operType',
          operStatus: '$userDetails.operStatus',
        },
      },

      // 第五步：排序
      {
        $sort: sortOptions,
      },

      // 第六步：分页
      {
        $skip: skip,
      },
      {
        $limit: pageSize,
      },
    ];

    // 执行聚合查询
    const userResult = await UserPost.aggregate(pipeline);

    console.log('userResult::', userResult);

    // 获取总记录数
    const totalUsers = await User.countDocuments({
      operId: { $in: userResult.map((item) => item.operId) },
    });

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

// 查询岗位下的权限
const queryPostAuth = async (ctx) => {
  try {
    const { postIds } = ctx.request.body;

    // 验证 postIds 参数
    if (!Array.isArray(postIds) || postIds.length === 0) {
      ctx.body = {
        status: 400,
        message: 'Invalid postIds parameter',
      };
      return;
    }

    // 定义聚合管道
    const pipeline = [
      // 匹配权限类型和标志
      {
        $match: {
          rightType: 2,
          authId: { $in: postIds },
          $or: [{ authRightFlag: 1 }, { reviewRightFlag: 1 }],
        },
      },
      // 提取 rightId 和类型标志
      {
        $project: {
          _id: 0,
          rightId: 1,
          type: {
            $cond: [
              { $eq: ['$authRightFlag', 1] }, // 如果是授权权限
              'auth',
              { $cond: [{ $eq: ['$reviewRightFlag', 1] }, 'review', null] }, // 如果是审核权限
            ],
          },
        },
      },
      // 过滤掉无效类型（type 为 null 的记录）
      { $match: { type: { $ne: null } } },
      // 查找 RightMapping 数据
      {
        $lookup: {
          from: 'rightMappings', // 替换为实际集合名称
          localField: 'rightId',
          foreignField: 'rightId',
          as: 'rightMapping',
        },
      },
      // 解构 RightMapping 数据
      {
        $unwind: {
          path: '$rightMapping',
          preserveNullAndEmptyArrays: false, // 忽略没有匹配到的数据
        },
      },
      // 提取 btnId 和 menuId
      {
        $project: {
          rightId: 1,
          type: 1,
          btnId: '$rightMapping.btnId',
          menuId: '$rightMapping.menuId',
        },
      },
      // 查找 MenuBtn 数据
      {
        $lookup: {
          from: 'menuBtns', // 替换为实际集合名称
          localField: 'btnId',
          foreignField: 'btnId',
          as: 'menuBtn',
        },
      },
      // 解构 MenuBtn 数据
      {
        $unwind: {
          path: '$menuBtn',
          preserveNullAndEmptyArrays: false,
        },
      },
      // 提取最终需要的字段
      {
        $project: {
          rightId: 1,
          type: 1,
          btnId: '$menuBtn.btnId',
          btnCode: '$menuBtn.btnCode',
          btnName: '$menuBtn.btnName',
          menuId: '$menuBtn.menuId',
          menuCode: '$menuBtn.menuCode',
          menuName: '$menuBtn.menuName',
        },
      },
      // 根据 menuId 和 btnId 去重
      {
        $group: {
          _id: {
            menuId: '$menuId',
            btnId: '$btnId',
          },
          data: { $first: '$$ROOT' }, // 取第一条记录
        },
      },
      // 解构去重后的数据
      {
        $replaceRoot: { newRoot: '$data' },
      },
      // 分组按类型分类
      {
        $group: {
          _id: '$type',
          rights: { $addToSet: '$$ROOT' }, // 使用 $addToSet 确保数组唯一
        },
      },
      // 解构分组结果，并过滤字段
      {
        $project: {
          _id: 0,
          type: '$_id',
          rights: {
            $map: {
              input: '$rights',
              as: 'right',
              in: {
                btnId: '$$right.btnId',
                btnCode: '$$right.btnCode',
                btnName: '$$right.btnName',
                menuId: '$$right.menuId',
                menuCode: '$$right.menuCode',
                menuName: '$$right.menuName',
              },
            },
          },
        },
      },
    ];

    // 执行聚合查询
    const results = await Right.aggregate(pipeline);

    // 构建最终结果
    const authRight =
      results.find((item) => item.type === 'auth')?.rights || [];
    const reviewRight =
      results.find((item) => item.type === 'review')?.rights || [];

    ctx.body = {
      status: 200,
      data: {
        authRight,
        reviewRight,
      },
    };
  } catch (error) {
    // 捕获并处理异常
    console.error('Error occurred during queryPostAuth:', error);
    ctx.body = {
      status: 500,
      message: 'Internal server error',
      error: error.message, // 返回具体的错误信息（可选）
    };
  }
};

module.exports = {
  batchImport,
  add,
  update,
  remove,
  detail,
  review,
  revoke,
  query,
  reviewedQuery,
  download,
  postName,
  permissionId,
  queryPostUser,
  queryPostAuth,
};
