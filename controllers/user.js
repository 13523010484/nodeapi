const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const XLSX = require('xlsx');
const { getNextSequenceValue } = require('../utils/sequence');

const menuTestData = require('../data/menuTest.js');
const menuAdminData = require('../data/menuAdmin.js');
const { User } = require('../model/user');
const { UserCertificate } = require('../model/userCertificate');
const { Certificate } = require('../model/certificate.js');
const { UserPost } = require('../model/userPost.js');
const { Right } = require('../model/right');
const { RightMapping } = require('../model/rightMapping');
const { review } = require('./post.js');
const { getCurrentFormattedDateTime } = require('../utils/utils');

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

const SECRET_KEY = 'jqh-server-jwt';

// 登录
const login = async (ctx) => {
  try {
    // 获取请求参数
    const { operCode, password } = ctx.request.body;

    // 参数校验
    if (!operCode || !password) {
      ctx.body = {
        status: 400,
        msg: '用户名或密码不能为空。',
      };
      return;
    }

    // 查询用户信息
    const userInfo = await User.findOne({ operCode }).select('password'); // 只查询密码字段

    // 用户不存在
    if (!userInfo) {
      ctx.body = {
        status: 403,
        msg: '用户未找到。',
      };
      return;
    }

    // 验证密码
    if (password !== userInfo.password) {
      ctx.body = {
        status: 405,
        msg: '用户密码错误。',
      };
      return;
    }

    // 生成 Token
    const token = jwt.sign({ operCode }, SECRET_KEY, {
      expiresIn: '7d', // 设置 Token 过期时间为 7 天
    });

    // 返回成功响应
    ctx.body = {
      status: 200,
      msg: '登录成功',
      data: {
        token,
      },
    };
  } catch (error) {
    // 捕获并处理异常
    console.error('Login error:', error.message); // 记录错误日志
    ctx.body = {
      status: 500,
      msg: '服务器内部错误，请稍后再试。',
      error: error.message, // 可选：返回具体的错误信息（仅用于调试）
    };
  }
};

/**
 * 获取用户信息
 * @param {string} token - 用户的 JWT token
 * @returns {Promise<Object>} 用户信息对象
 */
const getUserInfo = async (token) => {
  if (!token) {
    throw new Error('未提供Token');
  }

  let operCode;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    operCode = decoded.operCode;
  } catch (err) {
    throw new Error('无效的Token');
  }

  const user = await User.findOne({ operCode }).select('-password');

  if (!user) {
    throw new Error('用户未找到');
  }

  return user;
};

// 获取用户信息
const userInfo = async (ctx) => {
  // 从请求头中获取 token
  const token = ctx.request.headers.authorization?.split(' ')[1];

  try {
    const user = await getUserInfo(token);

    return (ctx.body = {
      status: 200,
      msg: '查询成功',
      data: {
        _id: user._id,
        operId: user.operId,
        operCode: user.operCode,
        operName: user.operName,
        deptId: user.deptId,
        avatar: user.avatar,
        mobile: user.mobile,
        operType: user.operType,
      },
    });
  } catch (err) {
    ctx.status = err.status || 401; // 默认状态码为401
    ctx.body = {
      status: ctx.status,
      msg: err.message || '查询失败',
    };
  }
};

// 退出登录
const logout = async (ctx) => {
  ctx.body = {
    status: 200,
    msg: '退出登录成功',
  };
};

// 查询菜单
const permission = async (ctx) => {
  const { userName } = ctx.request.body;
  ctx.body = {
    status: 200,
    msg: '查询成功',
    data: userName == 'admin' ? menuAdminData.data : menuTestData.data,
  };
};

// 用户管理批量导入数据（从Excel文件）
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
      const userData = {};

      // 使用headers数组中的元素作为键，record数组中的元素作为值
      headers.forEach((header, index) => {
        if (
          header == 'inputTm' ||
          header == 'updateTm' ||
          header == 'reviewTm'
        ) {
          userData[header] = convertExcelDate(record[index]);
        } else {
          userData[header] = record[index];
        }
      });

      console.log('userData::', userData);

      // 假设您有一个User模型，并且它有一个save方法
      const user = new User(userData);
      await user.save(); // 保存数据到数据库
      // 在保存后，你可以通过user._id访问新生成的_id
      console.log(`Saved user with _id: ${user._id}`);
    }

    ctx.body = { status: 'success', message: '部门申请数据批量导入成功' };
  } catch (error) {
    console.error('Error during Excel batch import:', error);
    ctx.body = { status: 'error', message: '部门申请数据批量导入时发生错误' };
    ctx.status = 500;
  }
};

// 用户新增
const add = async (ctx) => {
  const body = ctx.request.body;
  console.log('新增::=======', body);
  const operId = await getNextSequenceValue('operId');
  const { operName } = await userInfo(ctx);
  const newUser = new User({
    ...body,
    operId,
    operStatus: 1,
    inputOperName: operName,
  });
  await newUser
    .save()
    .then((res) => {
      console.log('User saved', res);
      ctx.body = {
        status: 200,
        msg: '保存成功',
      };
    })
    .catch((err) => {
      console.error('Error saving user:', err);
      ctx.body = {
        status: 500,
        msg: '保存失败',
        err,
      };
    });
};

// 用户查询
const query = async (ctx) => {
  const { operCode, operName, operStatus, pageSize, pageNum } =
    ctx.request.body;

  // 构建查询条件对象
  const queryConditions = {};
  if (operCode && operCode.length) {
    queryConditions.operCode = operCode;
  }

  if (operName && operName.length) {
    queryConditions.operName = operName;
  }

  if (operStatus && operStatus.length) {
    queryConditions.operStatus = {
      $in: operStatus,
    };
  }

  console.log('queryConditions::', queryConditions);

  try {
    // 同时进行分页查询和总数统计，根据查询条件
    const [docs, total] = await Promise.all([
      User.find(queryConditions)
        .limit(pageSize)
        .skip(pageSize * (pageNum - 1))
        .exec(), // 根据查询条件执行查询并返回结果
      User.countDocuments(queryConditions).exec(), // 根据查询条件执行计数并返回总数
    ]);

    console.log('docs::', docs);

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

// 用户修改
const update = async (ctx) => {
  const { operId } = ctx.request.body;
  const { operName } = await userInfo(ctx);
  await User.findOneAndUpdate(
    {
      operId,
    },
    {
      ...ctx.request.body,
      updateOperName: operName,
    }
  )
    .then((res) => {
      console.log('更新::', res);
      if (res) {
        ctx.body = {
          status: 200,
          msg: '修改成功',
        };
      } else {
        ctx.body = {
          status: 202,
          msg: '修改失败',
        };
      }
    })
    .catch((error) => {
      console.log('error::', error);
      ctx.body = {
        status: 500,
        msg: '修改失败',
        err,
      };
    });
};

// 用户下载
const download = async (ctx, next) => {
  // 创建一个新的Excel工作簿
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('部门管理');

  // 设置Excel的标题行
  worksheet.addRow([
    '用户编号',
    '用户名',
    '用户姓名',
    '所属机构',
    '所属部门',
    '办公电话',
    '手机',
    '职务类型',
    '备注',
    '用户状态',
    '录入人',
    '录入时间',
    '更新人',
    '更新时间',
    '复核人',
    '复核时间',
  ]); // 示例字段名，请根据实际情况调整

  // 查询数据库并将结果添加到Excel中
  const data = await User.find({}).exec();
  data.forEach((item) => {
    worksheet.addRow([
      item.operId,
      item.operCode,
      item.operName,
      item.memCode,
      item.deptId,
      item.officeTel,
      item.mobile,
      item.updateOperName,
      item.posiType,
      item.reviewTm,
      item.remark,
      item.operStatus,
      item.operType,
      item.inputOperId,
      item.inputTm,
      item.updateOperId,
      item.updateTm,
      item.reviewOperId,
      item.reviewTm,
    ]); // 根据实际字段名调整
  });

  // 设置HTTP响应头
  ctx.set(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  ctx.set('Content-Disposition', 'attachment; filename="departments.xlsx"');

  // 生成Excel文件的Buffer
  const excelBuffer = await workbook.xlsx.writeBuffer();

  // 将Buffer作为响应体发送
  ctx.body = excelBuffer;

  await next();
};

// 用户冻结
const freeze = async (ctx) => {
  try {
    const { _id } = ctx.request.body;

    await User.updateOne({ _id }, { operStatus: '2' });
    ctx.body = {
      status: 200,
      msg: '冻结成功',
    };
  } catch (error) {
    // 错误处理
    ctx.body = {
      status: 500,
      msg: '冻结失败',
    };
  }
};

// 用户解冻
const notFrozen = async (ctx) => {
  try {
    const { _id } = ctx.request.body;

    await User.updateOne({ _id }, { operStatus: '1' });
    ctx.body = {
      status: 200,
      msg: '解冻成功',
    };
  } catch (error) {
    // 错误处理
    ctx.body = {
      status: 500,
      msg: '解冻失败',
    };
  }
};

// 用户注销
const userLogout = async (ctx) => {
  try {
    const { _id } = ctx.request.body;

    await User.updateOne({ _id }, { operStatus: '3' });
    ctx.body = {
      status: 200,
      msg: '注销成功',
    };
  } catch (error) {
    // 错误处理
    ctx.body = {
      status: 500,
      msg: '注销失败',
    };
  }
};

// 用户重置密码
const resetPassword = async (ctx) => {
  const { _id } = ctx.request.body;
  await User.findOneAndUpdate(
    {
      _id, // 相当于 where 条件
    },
    {
      password: '123456',
    }
  )
    .then((res) => {
      if (res) {
        ctx.body = {
          status: 200,
          msg: '重置成功',
        };
      } else {
        ctx.body = {
          status: 202,
          msg: '重置失败',
        };
      }
    })
    .catch((error) => {
      console.log('error::', error);
      ctx.body = {
        status: 500,
        msg: '重置失败',
        err,
      };
    });
};

// 用户添加证书
const addCertificate = async (ctx) => {
  const body = ctx.request.body;
  console.log('新增::=======', body);
  const newUserCertificate = new UserCertificate({
    ...body,
  });
  await newUserCertificate
    .save()
    .then((res) => {
      console.log('UserCertificate saved', res);
      ctx.body = {
        status: 200,
        msg: '保存成功',
      };
    })
    .catch((err) => {
      console.error('Error saving UserCertificate:', err);
      ctx.body = {
        status: 500,
        msg: '保存失败',
        err,
      };
    });
};

const queryCertificate = async (ctx) => {
  const { DN, isBind, userId, pageSize = 10, pageNum = 1 } = ctx.request.body;
  const skip = (pageNum - 1) * pageSize;

  // 构建查询条件对象（只针对DN，因为isBind将在后面处理）
  const queryConditions = {};
  if (DN && DN.length) {
    queryConditions.DN = { $regex: new RegExp(DN, 'i') };
  }

  try {
    // 查询当前用户绑定的证书ID（假设返回的是证书ID数组）
    const userCertificateData = await UserCertificate.find(
      { userId },
      'certificateId'
    );
    const boundCertificateIds = userCertificateData.map((item) =>
      item.certificateId.toString()
    );

    // 查询所有证书（先不考虑isBind）
    const allCertificates = await Certificate.find(queryConditions)
      .sort(/* 排序逻辑 */)
      .skip(skip)
      .limit(pageSize);

    const { operCode, operName } = await User.findOne({ _id: userId }).select({
      operName: 1,
      operCode: 1,
    });

    // 假设 'true' 或 '1' 表示只查询已绑定的证书
    let markedCertificates = allCertificates.filter((cert) =>
      boundCertificateIds.includes(cert._id.toString())
    );

    // 标记每个证书是否绑定（这一步现在是在过滤之后做的，但实际上在过滤时就已经确定了）
    markedCertificates = markedCertificates.map((cert) => ({
      ...cert.toObject(),
      operCode,
      operName,
    }));

    // 格式化返回结果
    ctx.body = {
      status: 200,
      msg: '查询成功',
      data: {
        rows: markedCertificates, // 带有isBind标记的证书列表
        total: markedCertificates.length, // 匹配查询条件的证书总数（未过滤）
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

const deleteCertificate = async (ctx) => {
  const { userId, certificateId } = ctx.request.body;
  await UserCertificate.deleteOne({
    userId: userId,
    certificateId: certificateId,
  })
    .then(() => {
      console.log('User-Certificate relation deleted');
      ctx.body = {
        status: 200,
        msg: '删除成功',
      };
    })
    .catch((error) => {
      console.error('Error deleting user-certificate relation', error);
      ctx.body = {
        status: 500,
        msg: '删除失败',
        err,
      };
    });
};

// 用户绑定岗位
const bindPost = async (ctx) => {
  try {
    const token = ctx.request.headers.authorization?.split(' ')[1];
    const { operId, postIds } = ctx.request.body;
    const { operCode, operType } = await getUserInfo(token);

    // 参数校验
    if (!Array.isArray(postIds) || postIds.length === 0) {
      ctx.body = {
        status: 400,
        msg: '必须提供至少一个岗位ID',
      };
      return;
    }

    // 权限校验
    if (operType !== 2) {
      ctx.body = {
        status: 401,
        msg: `当前用户是${
          ['超级管理员', '部门管理员', '操作员'][operType - 1]
        }，仅部门管理员能进行岗位绑定操作。`,
      };
      return;
    }

    // 删除原有的用户岗位关系
    await UserPost.deleteMany({ operId });
    console.log(`用户ID ${operId} 的原有岗位关系已删除`);

    // 创建一个新的Promise数组，用于保存新的岗位绑定
    const savePromises = postIds.map(async (postId) => {
      try {
        const newUserPost = new UserPost({
          operId,
          postId,
          inputOperCode: operCode,
          inputTime: new Date(), // 设置录入时间为当前时间
          updateTime: new Date(), // 设置更新时间为当前时间
        });
        await newUserPost.save();
        console.log(`岗位ID ${postId} 绑定成功`);
      } catch (err) {
        console.error(`岗位ID ${postId} 绑定失败:`, err);
        throw err; // 抛出错误，让Promise.all捕获
      }
    });

    // 等待所有保存操作完成
    await Promise.all(savePromises);

    // 返回成功响应
    ctx.body = {
      status: 200,
      msg: '所有岗位绑定成功',
    };
  } catch (err) {
    // 捕获并处理异常
    console.error('部分岗位绑定失败:', err);
    ctx.body = {
      status: 500, // 根据情况，您可能想使用更具体的状态码，如409（冲突）
      msg: '部分岗位绑定失败',
      err: err.message || '未知错误', // 根据需要调整错误信息的显示
    };
  }
};

// 更新后的 uploadAvatar 方法
const uploadAvatar = async (ctx) => {
  const token = ctx.request.headers.authorization?.split(' ')[1];
  console.log('token::', token);

  try {
    // 调用 getUserInfo 方法获取用户信息
    const user = await getUserInfo(token);

    const { operName, password } = ctx.request.body;
    const { avatar: file } = ctx.request.files;
    const operNameExist = await User.exists({
      operName,
      operId: { $ne: user.operId },
    });

    if (operNameExist) {
      return (ctx.body = {
        status: 400,
        msg: '用户名已存在，请选择其他用户名。',
      });
    }

    if (!file) {
      return (ctx.body = {
        status: 400,
        msg: '没有找到要上传的文件',
      });
    }

    // 如果提供了新的操作用户名，则更新之
    if (operName) {
      user.operName = operName;
    }

    // 如果提供了新的密码，则更新之
    if (password) {
      user.password = password;
    }

    // 删除旧头像（如果存在）
    if (user.avatar) {
      const oldAvatarPath = path.join(
        process.cwd(),
        'uploads',
        path.basename(user.avatar)
      );
      try {
        await fs.unlink(oldAvatarPath); // 删除旧头像文件
        console.log(`旧头像已删除: ${oldAvatarPath}`);
      } catch (unlinkErr) {
        if (unlinkErr.code !== 'ENOENT') {
          // ENOENT 表示文件不存在，可以忽略
          throw unlinkErr; // 其他错误则抛出
        }
      }
    }

    // 将文件移动到永久存储目录
    const avatarPath = path.join(
      'uploads',
      `${crypto.randomBytes(16).toString('hex')}${path.extname(
        file.originalFilename
      )}`
    );

    // 确保目标目录存在
    await fs.mkdir(path.dirname(avatarPath), { recursive: true });

    // 移动文件到永久存储目录
    await fs.rename(file.filepath, avatarPath);

    // 更新用户头像 URL
    user.avatar = `/${path.basename(avatarPath)}`;

    // 保存更新后的用户信息
    await user.save();

    ctx.body = {
      status: 200,
      msg: '头像上传成功',
      url: user.avatar,
    };
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      status: ctx.status,
      msg: err.message || '上传失败',
    };
  }
};

// 部门管理员查询
const adminQuery = async (ctx) => {
  const { operCode, operName, operStatus, pageSize, pageNum } =
    ctx.request.body;

  // 构建查询条件对象
  const queryConditions = {
    operType: 2,
    operStatus: 1,
  };
  if (operCode && operCode.length) {
    queryConditions.operCode = { $regex: new RegExp(operCode, 'i') };
  }

  if (operName && operName.length) {
    queryConditions.operName = { $regex: new RegExp(operName, 'i') };
  }

  if (operStatus && operStatus.length) {
    queryConditions.operStatus = {
      $in: operStatus,
    };
  }

  console.log('queryConditions::', queryConditions);

  try {
    const [docs, total] = await Promise.all([
      User.aggregate([
        { $match: queryConditions },
        {
          $lookup: {
            from: 'departments',
            localField: 'deptId',
            foreignField: 'deptId',
            as: 'departmentInfo',
          },
        },
        {
          $unwind: '$departmentInfo',
        },
        {
          $addFields: {
            deptName: '$departmentInfo.deptName',
          },
        },
        {
          $project: {
            _id: 0,
            operId: 1,
            operCode: 1,
            operName: 1,
            deptId: 1,
            deptName: 1,
            officeTel: 1,
            mobile: 1,
            updateOperName: 1,
            remark: 1,
            operStatus: 1,
            operType: 1,
            inputOperName: 1,
            updateTm: 1,
            avatar: 1,
            inputTm: 1,
          },
        },
        // 分页处理
        { $skip: pageSize * (pageNum - 1) },
        { $limit: pageSize },
      ]),
      User.countDocuments(queryConditions).exec(), // 查询总记录数
    ]);

    console.log('docs::', docs);

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

// 部门管理员新增
const adminAdd = async (ctx) => {
  const body = ctx.request.body;
  console.log('新增::=======', body);
  const operId = await getNextSequenceValue('operId');
  const {
    data: { operName },
  } = await userInfo(ctx);
  const newUser = new User({
    ...body,
    operId,
    operType: 2,
    operStatus: 1,
    inputOperName: operName,
  });
  await newUser
    .save()
    .then((res) => {
      console.log('User saved', res);
      ctx.body = {
        status: 200,
        msg: '保存成功',
      };
    })
    .catch((err) => {
      console.error('Error saving user:', err);
      ctx.body = {
        status: 500,
        msg: '保存失败',
        err,
      };
    });
};

// 部门管理员更新
const adminUpdate = async (ctx) => {
  const { operId } = ctx.request.body;
  const {
    data: { operName },
  } = await userInfo(ctx);
  await User.findOneAndUpdate(
    {
      operId,
    },
    {
      ...ctx.request.body,
      operType: 2,
      operStatus: 1,
      updateOperName: operName,
    }
  )
    .then((res) => {
      console.log('更新::', res);
      if (res) {
        ctx.body = {
          status: 200,
          msg: '修改成功',
        };
      } else {
        ctx.body = {
          status: 202,
          msg: '修改失败',
        };
      }
    })
    .catch((error) => {
      console.log('error::', error);
      ctx.body = {
        status: 500,
        msg: '修改失败',
        err,
      };
    });
};

// 部门管理员详情，根据 operId 查询详情
const adminDetail = async (ctx) => {
  try {
    // 从请求头中获取 token
    const token = ctx.request.headers.authorization?.split(' ')[1];
    if (!token) {
      ctx.status = 400;
      ctx.body = { status: 400, msg: 'Token is required' };
      return;
    }

    const { operId } = ctx.query;
    if (!operId) {
      ctx.status = 400;
      ctx.body = { status: 400, msg: 'OperId is required' };
      return;
    }

    const user = await User.findOne({ operId }).lean();
    const { operCode, operName, deptId, deptName, officeTel, mobile, remark } =
      user;
    if (!user) {
      ctx.status = 404;
      ctx.body = { status: 404, msg: 'User not found' };
      return;
    }

    const pipeline = [
      {
        $match: { authId: deptId },
      },
      {
        $lookup: {
          from: 'rightMappings',
          localField: 'rightId',
          foreignField: 'rightId',
          as: 'rightMappingData',
        },
      },
      {
        $project: {
          _id: 0,
          rightId: 1,
          authRightFlag: 1,
          reviewRightFlag: 1,
          rightMappingData: 1,
        },
      },
      {
        $group: {
          _id: null,
          authRightIds: {
            $push: {
              $cond: [{ $eq: ['$authRightFlag', 1] }, '$rightId', null],
            },
          },
          reviewRightIds: {
            $push: {
              $cond: [{ $eq: ['$reviewRightFlag', 1] }, '$rightId', null],
            },
          },
          allRightMappingData: { $push: '$rightMappingData' },
        },
      },
      {
        $project: {
          authRightIds: {
            $filter: {
              input: '$authRightIds',
              as: 'item',
              cond: { $ne: ['$$item', null] },
            },
          },
          reviewRightIds: {
            $filter: {
              input: '$reviewRightIds',
              as: 'item',
              cond: { $ne: ['$$item', null] },
            },
          },
          allRightMappingData: 1,
        },
      },
    ];

    const result = await Right.aggregate(pipeline);

    if (!result || result.length === 0) {
      ctx.status = 404;
      ctx.body = {
        status: 404,
        msg: 'No permissions found for the department',
      };
      return;
    }

    const [data] = result;
    const authRightIds = data.authRightIds || [];
    const reviewRightIds = data.reviewRightIds || [];
    const allRightMappingData = data.allRightMappingData.flat().flat() || [];
    const authRightData = allRightMappingData.filter(
      (item) => item && authRightIds.includes(item.rightId)
    );
    const reviewRightData = allRightMappingData.filter(
      (item) => item && reviewRightIds.includes(item.rightId)
    );

    ctx.body = {
      status: 200,
      msg: '修改成功',
      data: {
        operId: Number(operId),
        operCode,
        operName,
        deptId,
        deptName,
        officeTel,
        mobile,
        remark,
        authRight: authRightData.map((item) => ({
          id: item.id,
          menuId: item.menuId,
          btnId: item.btnId,
        })),
        reviewRight: reviewRightData.map((item) => ({
          id: item.id,
          menuId: item.menuId,
          btnId: item.btnId,
        })),
      },
    };
  } catch (error) {
    console.error('Error occurred:', error);
    ctx.body = {
      status: 500,
      msg: 'Internal Server Error',
      details: error.message,
    };
  }
};

// 部门管理员删除 operId
const adminRemove = async (ctx) => {
  const { operId } = ctx.request.body;
  const {
    data: { operName },
  } = await userInfo(ctx);
  await User.findOneAndUpdate(
    {
      operId,
    },
    {
      operStatus: 0,
      updateOperName: operName,
    }
  )
    .then((res) => {
      console.log('更新::', res);
      if (res) {
        ctx.body = {
          status: 200,
          msg: '修改成功',
        };
      } else {
        ctx.body = {
          status: 202,
          msg: '修改失败',
        };
      }
    })
    .catch((error) => {
      console.log('error::', error);
      ctx.body = {
        status: 500,
        msg: '修改失败',
        err,
      };
    });
};

// 部门管理员重置密码 operId
const adminResetPassword = async (ctx) => {
  const { operId } = ctx.request.body;
  const {
    data: { operName },
  } = await userInfo(ctx);
  await User.findOneAndUpdate(
    {
      operId,
    },
    {
      password: '123456',
      updateOperName: operName,
    }
  )
    .then((res) => {
      console.log('更新::', res);
      if (res) {
        ctx.body = {
          status: 200,
          msg: '修改成功',
        };
      } else {
        ctx.body = {
          status: 202,
          msg: '修改失败',
        };
      }
    })
    .catch((error) => {
      console.log('error::', error);
      ctx.body = {
        status: 500,
        msg: '修改失败',
        err,
      };
    });
};

// 部门管理员下载
const adminDownload = async (ctx, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('部门管理员');

    // 设置Excel的标题行
    worksheet.addRow([
      '部门id',
      '部门名称',
      '用户名',
      '用户姓名',
      '用户状态',
      '备注',
      '录入人',
      '录入时间',
      '更新人',
      '更新时间',
    ]);

    const data = await User.find({ operType: 2 }).exec();
    data.forEach((item) => {
      worksheet.addRow([
        item.deptId,
        item.deptName,
        item.operCode,
        item.operName,
        item.operStatus,
        item.remark,
        item.inputOperName,
        item.inputTm,
        item.updateOperName,
        item.updateTm,
      ]);
    });

    const timestamp = getCurrentFormattedDateTime();
    const fileName = `部门管理员_${timestamp}.xlsx`.replace(/:/g, '-');
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

// 部门操作员查询
const operateQuery = async (ctx) => {
  const { operCode, operName, operStatus, pageSize, pageNum } =
    ctx.request.body;

  // 构建查询条件对象
  const queryConditions = {
    operType: 3,
    operStatus: 1,
  };
  if (operCode && operCode.length) {
    queryConditions.operCode = { $regex: new RegExp(operCode, 'i') };
  }

  if (operName && operName.length) {
    queryConditions.operName = { $regex: new RegExp(operName, 'i') };
  }

  if (operStatus && operStatus.length) {
    queryConditions.operStatus = {
      $in: operStatus,
    };
  }

  console.log('queryConditions::', queryConditions);

  try {
    const [docs, total] = await Promise.all([
      User.aggregate([
        { $match: queryConditions },
        {
          $lookup: {
            from: 'departments',
            localField: 'deptId',
            foreignField: 'deptId',
            as: 'departmentInfo',
          },
        },
        {
          $unwind: '$departmentInfo',
        },
        {
          $addFields: {
            deptName: '$departmentInfo.deptName',
          },
        },
        {
          $project: {
            _id: 0,
            operId: 1,
            operCode: 1,
            operName: 1,
            deptId: 1,
            deptName: 1,
            officeTel: 1,
            mobile: 1,
            updateOperName: 1,
            remark: 1,
            operStatus: 1,
            operType: 1,
            inputOperName: 1,
            updateTm: 1,
            avatar: 1,
            inputTm: 1,
          },
        },
        // 分页处理
        { $skip: pageSize * (pageNum - 1) },
        { $limit: pageSize },
      ]),
      User.countDocuments(queryConditions).exec(), // 查询总记录数
    ]);

    console.log('docs::', docs);

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

// 部门操作员新增
const operateAdd = async (ctx) => {
  const body = ctx.request.body;
  console.log('新增::=======', body);
  const operId = await getNextSequenceValue('operId');
  const {
    data: { operName },
  } = await userInfo(ctx);
  const newUser = new User({
    ...body,
    operId,
    operType: 3,
    operStatus: 1,
    inputOperName: operName,
  });
  await newUser
    .save()
    .then((res) => {
      console.log('User saved', res);
      ctx.body = {
        status: 200,
        msg: '保存成功',
      };
    })
    .catch((err) => {
      console.error('Error saving user:', err);
      ctx.body = {
        status: 500,
        msg: '保存失败',
        err,
      };
    });
};

// 部门操作员更新
const operateUpdate = async (ctx) => {
  const { operId } = ctx.request.body;
  const {
    data: { operName },
  } = await userInfo(ctx);
  await User.findOneAndUpdate(
    {
      operId,
    },
    {
      ...ctx.request.body,
      operType: 3,
      operStatus: 1,
      updateOperName: operName,
    }
  )
    .then((res) => {
      console.log('更新::', res);
      if (res) {
        ctx.body = {
          status: 200,
          msg: '修改成功',
        };
      } else {
        ctx.body = {
          status: 202,
          msg: '修改失败',
        };
      }
    })
    .catch((error) => {
      console.log('error::', error);
      ctx.body = {
        status: 500,
        msg: '修改失败',
        err,
      };
    });
};

// 部门操作员详情，根据 operId 查询详情
const operateDetail = async (ctx) => {
  const { operId } = ctx.query;

  if (!operId) {
    ctx.body = {
      status: 400,
      msg: '缺少 operId 参数',
    };
    return;
  }

  try {
    const pipeline = [
      // 匹配 operId
      { $match: { operId: parseInt(operId, 10) } },
      // 选择需要的字段
      {
        $project: {
          _id: 0,
          operId: 1,
          operCode: 1,
          operName: 1,
          deptId: 1,
          officeTel: 1,
          mobile: 1,
          remark: 1,
          operStatus: 1,
          operType: 1,
        },
      },
      // 使用 $lookup 关联 userPosts 集合
      {
        $lookup: {
          from: 'userPosts',
          localField: 'operId', // 当前集合中的字段
          foreignField: 'operId', // userPosts 集合中的字段
          as: 'postInfo', // 关联结果存储的字段名
        },
      },
      // 提取 postIds 数组
      {
        $addFields: {
          postIds: {
            $map: { input: '$postInfo', as: 'item', in: '$$item.postId' },
          }, // 提取 postId
        },
      },
      // 移除不必要的字段
      { $project: { postInfo: 0 } }, // 移除 postInfo 字段
    ];

    const result = await User.aggregate(pipeline);

    if (!result || result.length === 0) {
      ctx.body = {
        status: 404,
        msg: '未找到相关记录',
      };
      return;
    }

    ctx.body = {
      status: 200,
      msg: '查询成功',
      data: result[0],
    };
  } catch (err) {
    ctx.body = {
      status: 500,
      msg: '查询失败',
      error: err.message,
    };
  }
};

// 部门操作员删除 operId
const operateRemove = async (ctx) => {
  const { operId } = ctx.request.body;
  const {
    data: { operName },
  } = await userInfo(ctx);
  await User.findOneAndUpdate(
    {
      operId,
    },
    {
      operStatus: 0,
      updateOperName: operName,
    }
  )
    .then((res) => {
      console.log('更新::', res);
      if (res) {
        ctx.body = {
          status: 200,
          msg: '修改成功',
        };
      } else {
        ctx.body = {
          status: 202,
          msg: '修改失败',
        };
      }
    })
    .catch((error) => {
      console.log('error::', error);
      ctx.body = {
        status: 500,
        msg: '修改失败',
        err,
      };
    });
};

// 部门操作员重置密码 operId
const operateResetPassword = async (ctx) => {
  const { operId } = ctx.request.body;
  const {
    data: { operName },
  } = await userInfo(ctx);
  await User.findOneAndUpdate(
    {
      operId,
    },
    {
      password: '123456',
      updateOperName: operName,
    }
  )
    .then((res) => {
      console.log('更新::', res);
      if (res) {
        ctx.body = {
          status: 200,
          msg: '修改成功',
        };
      } else {
        ctx.body = {
          status: 202,
          msg: '修改失败',
        };
      }
    })
    .catch((error) => {
      console.log('error::', error);
      ctx.body = {
        status: 500,
        msg: '修改失败',
        err,
      };
    });
};

// 部门操作员下载
const operateDownload = async (ctx, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('部门操作员');

    // 设置Excel的标题行
    worksheet.addRow([
      '部门id',
      '部门名称',
      '用户名',
      '用户姓名',
      '用户状态',
      '备注',
      '录入人',
      '录入时间',
      '更新人',
      '更新时间',
    ]);

    const data = await User.find({ operType: 3 }).exec();
    data.forEach((item) => {
      worksheet.addRow([
        item.deptId,
        item.deptName,
        item.operCode,
        item.operName,
        item.operStatus,
        item.remark,
        item.inputOperName,
        item.inputTm,
        item.updateOperName,
        item.updateTm,
      ]);
    });

    const timestamp = getCurrentFormattedDateTime();
    const fileName = `部门操作员_${timestamp}.xlsx`.replace(/:/g, '-');
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

module.exports = {
  getUserInfo,
  login,
  userInfo,
  permission,
  logout,
  batchImport,
  add,
  query,
  update,
  download,
  freeze,
  notFrozen,
  userLogout,
  resetPassword,
  addCertificate,
  queryCertificate,
  deleteCertificate,
  bindPost,
  uploadAvatar,
  adminQuery,
  adminAdd,
  adminDetail,
  adminUpdate,
  adminRemove,
  adminResetPassword,
  adminDownload,
  operateQuery,
  operateAdd,
  operateDetail,
  operateUpdate,
  operateRemove,
  operateResetPassword,
  operateDownload,
};
