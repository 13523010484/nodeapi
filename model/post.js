const mongoose = require('mongoose');

// 岗位表 Schema 定义
const PostSchema = new mongoose.Schema({
  // 所属部门
  deptId: {
    type: Number,
    required: true,
  },
  // 岗位 id
  postId: {
    type: Number,
    required: true,
    unique: true,
  },
  // 岗位名称
  postName: {
    type: String,
    default: '',
  },
  // 岗位状态
  postStatus: {
    type: Number,
    default: 1,
  },
  // 备注
  remark: {
    type: String,
    default: '',
  },
  // 录入操作员姓名
  inputOperName: {
    type: String,
    default: '',
  },
  inputTime: {
    type: Date,
    default: Date.now,
  }, // 录入时间
  // 更新操作员姓名
  updateOperName: {
    type: String,
    default: '',
  },
  // 更新时间
  updateTime: {
    type: Date,
    default: Date.now,
  },
});

// 使用 Schema 创建模型，注意模型名称首字母大写，Mongoose 会自动处理复数形式
const Post = mongoose.model('Post', PostSchema, 'posts');

module.exports = {
  Post,
};
