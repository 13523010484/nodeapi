const mongoose = require('mongoose');

// 用户表 Schema 定义
const UserSchema = new mongoose.Schema({
  // 用户编号
  operId: {
    type: Number,
    required: true,
    unique: true,
  },
  // 用户名
  operCode: {
    type: String,
    default: '',
  },
  // 用户姓名
  operName: {
    type: String,
    default: '',
  },
  // 所属部门
  deptId: {
    type: Number,
    default: null,
  },
  // 办公电话
  officeTel: {
    type: String,
    default: '',
  },
  // 手机
  mobile: {
    type: String,
    default: '',
  },
  // 录入人
  inputOperName: {
    type: String,
    default: '',
  },
  // 录入时间
  inputTm: {
    type: Date,
    default: Date.now,
  },
  // 更新人
  updateOperName: {
    type: String,
    default: '',
  },
  // 更新时间
  updateTm: {
    type: Date,
    default: Date.now,
  },
  // 备注
  remark: {
    type: String,
    default: '',
  },
  // 用户状态
  operStatus: {
    type: Number,
    default: 1,
  },
  // 用户类型
  operType: {
    type: Number,
    default: 1,
  },
  // 密码
  password: {
    type: String,
    default: '123456',
  },
  // 用户头像
  avatar: {
    type: String,
    default: '',
  },
});

// 使用 Schema 创建模型，注意模型名称首字母大写，Mongoose 会自动处理复数形式
const User = mongoose.model('User', UserSchema, 'users');

module.exports = {
  User,
};
