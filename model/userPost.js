const mongoose = require('mongoose');
const { Schema } = mongoose;

// 用户岗位关联表 Schema 定义
const UserPostSchema = new Schema({
  operId: {
    type: Number,
    ref: 'User',
    required: true,
  },
  postId: {
    type: Number,
    ref: 'Post',
    required: true,
  },
  inputOperCode: {
    type: String,
    required: true,
  }, // 录入人
  inputTime: {
    type: Date,
    default: Date.now,
  }, // 录入时间
  updateTime: {
    type: Date,
    default: Date.now,
  }, // 更新时间
});

// 使用 Schema 创建模型，注意模型名称首字母大写，Mongoose 会自动处理复数形式
const UserPost = mongoose.model('UserPost', UserPostSchema, 'userPosts');

module.exports = {
  UserPost,
};
