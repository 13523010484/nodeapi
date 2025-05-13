const mongoose = require('mongoose');
const { Schema } = mongoose;

// 用户证书关联表 Schema 定义
const UserCertificateSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  certificateId: {
    type: Schema.Types.ObjectId,
    ref: 'Certificate',
    required: true,
  },
});

// 使用 Schema 创建模型，注意模型名称首字母大写，Mongoose 会自动处理复数形式
const UserCertificate = mongoose.model(
  'UserCertificate',
  UserCertificateSchema,
  'userCertificates'
);

module.exports = {
  UserCertificate,
};
