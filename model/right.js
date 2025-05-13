const mongoose = require('mongoose');

const RightSchema = new mongoose.Schema({
  rightId: {
    type: Number,
    required: true,
    unique: true,
  },
  rightType: {
    type: Number,
    required: true,
  }, // 权限类型 1 或 2
  authId: {
    type: Number,
    required: true,
  }, // 部门ID或岗位ID
  authRightFlag: {
    type: Number,
    default: 0,
  }, // 授权权限
  reviewRightFlag: {
    type: Number,
    default: 0,
  }, // 操作权限
  inputOperId: {
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

const Right = mongoose.model('Right', RightSchema);

module.exports = {
  Right,
};
