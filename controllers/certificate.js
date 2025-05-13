const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const { Certificate } = require('../model/certificate.js');

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
      const certificateData = {};

      // 使用headers数组中的元素作为键，record数组中的元素作为值
      headers.forEach((header, index) => {
        if (header == 'startDate' || header == 'endDate') {
          certificateData[header] = convertExcelDate(record[index]);
        } else {
          certificateData[header] = record[index];
        }
      });

      // 假设您有一个User模型，并且它有一个save方法
      const certificate = new Certificate(certificateData);
      await certificate.save(); // 保存数据到数据库
      // 在保存后，你可以通过user._id访问新生成的_id
      console.log(`Saved certificate with _id: ${certificate._id}`);
    }

    ctx.body = { status: 'success', message: '证书数据批量导入成功' };
  } catch (error) {
    console.error('Error during Excel batch import:', error);
    ctx.body = { status: 'error', message: '证书数据批量导入时发生错误' };
    ctx.status = 500;
  }
};

// 用户查询
const query = async (ctx) => {
  try {
    // 使用 await 等待异步操作完成
    const certificate = await Certificate.find({}).select({ _id: 1, DN: 1 });

    // 格式化返回结果
    ctx.body = {
      status: 200,
      msg: '查询成功',
      data: certificate,
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

// 用户修改
const update = async (ctx) => {
  const { _id } = ctx.request.body;
  await Certificate.findOneAndUpdate(
    {
      _id, // 相当于 where 条件
    },
    ctx.request.body
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

module.exports = {
  batchImport,
  query,
  update,
};
