const mongoose = require('mongoose');

// 菜单表 Schema 定义
const MenuBtnSchema = new mongoose.Schema({
  // 按钮 id
  btnId: {
    type: Number,
    required: true,
    unique: true,
  },
  // 按钮 code
  btnCode: {
    type: String,
    required: true,
    unique: true,
  },
  // 按钮名称
  btnName: {
    type: String,
    default: '',
  },
  // 按钮 url
  btnUrl: {
    type: String,
    default: '',
  },
  // 请求方法
  requestMethod: {
    type: String,
    default: 'POST',
  },
  // 按钮顺序
  btnSeqId: {
    type: Number,
    default: 0,
  },
  // 菜单 id
  menuId: {
    type: Number,
    default: null,
  },
  // 菜单名
  menuName: {
    type: String,
    default: '',
  },
  // 菜单名
  menuName: {
    type: String,
    default: '',
  },
  // 创建日期
  createDate: {
    type: Date,
    default: Date.now,
  },
  // 更新日期
  updateDate: {
    type: Date,
    default: Date.now,
  },
  // 按钮分组
  btnGroup: {
    type: Array,
    default: null,
  },
});

// 使用 Schema 创建模型，注意模型名称首字母大写，Mongoose 会自动处理复数形式
const MenuBtn = mongoose.model('MenuBtn', MenuBtnSchema, 'menuBtns');

module.exports = {
  MenuBtn,
};
