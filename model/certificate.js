const mongoose = require('mongoose');

// 证书表 Schema 定义
const CertificateSchema = new mongoose.Schema({
  // 证书 DN
  DN: {
    type: String,
    default: '',
  },
  // 算法类型
  algorithmType: {
    type: String,
    default: '',
  },
  // 有效开始日期
  startDate: {
    type: String,
    default: '',
  },
  // 有效结束日期
  endDate: {
    type: String,
    default: '',
  },
});

// 使用 Schema 创建模型，注意模型名称首字母大写，Mongoose 会自动处理复数形式
const Certificate = mongoose.model(
  'Certificate',
  CertificateSchema,
  'certificates'
);

module.exports = {
  Certificate,
};
