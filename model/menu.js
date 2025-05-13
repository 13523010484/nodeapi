const mongoose = require('mongoose');

// 菜单表 Schema 定义
const MenuSchema = new mongoose.Schema({
  // 菜单 id
  menuId: {
    type: Number,
    required: true,
    unique: true,
  },
  // 菜单 code
  menuCode: {
    type: String,
    required: true,
    unique: true,
  },
  // 父级 id
  parentId: {
    type: Number,
    default: null,
  },
  // 菜单名
  menuName: {
    type: String,
    default: '',
  },
  // 菜单顺序
  menuSeqId: {
    type: Number,
    default: 0,
  },
  // 菜单图标
  menuIcon: {
    type: String,
    default: '',
  },
  // 菜单路由
  menuUrl: {
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
});

// 使用 Schema 创建模型，注意模型名称首字母大写，Mongoose 会自动处理复数形式
const Menu = mongoose.model('Menu', MenuSchema, 'menus');

module.exports = {
  Menu,
};
