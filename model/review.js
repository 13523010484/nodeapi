const mongoose = require('mongoose');

// 复核表 Schema 定义
const ReviewSchema = new mongoose.Schema({
  // 申请 id
  drrId: {
    type: String,
    default: '',
  },
  // 申请编号
  drrCode: {
    type: String,
    default: '',
  },
  // 申请日期
  drrDate: {
    type: String,
    default: '',
  },
  // 数据类型
  drrOperType: {
    type: String,
    default: '',
  },
  // 操作类型
  drrOperType: {
    type: String,
    default: '',
  },
  // 申请状态
  drrStatus: {
    type: String,
    default: '',
  },
  // 申请人 id
  inputOperId: {
    type: String,
    default: '',
  },
  // 申请人用户名
  inputOperCode: {
    type: String,
    default: '',
  },
  // 申请人姓名
  inputOperName: {
    type: String,
    default: '',
  },
  // 申请时间
  inputTm: {
    type: String,
    default: '',
  },
  // 复核人 id
  reviewOperId: {
    type: String,
    default: '',
  },
  // 复核人用户名
  reviewOperCode: {
    type: String,
    default: '',
  },
  // 复核人姓名
  reviewOperName: {
    type: String,
    default: '',
  },
  // 复核时间
  reviewTm: {
    type: String,
    default: '',
  },
  // 更新操作员 id
  updateOperId: {
    type: String,
    default: '',
  },
  // 更新操作员用户名
  updateOperCode: {
    type: String,
    default: '',
  },
  // 更新操作员姓名
  updateOperName: {
    type: String,
    default: '',
  },
  // 更新时间
  updateTm: {
    type: String,
    default: '',
  },
});

// 使用 Schema 创建模型，注意模型名称首字母大写，Mongoose 会自动处理复数形式
const review = mongoose.model('review', ReviewSchema, 'reviews');

module.exports = {
  review,
};
