const mongoose = require('mongoose');

const RightMappingSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  rightId: {
    type: Number,
    required: true,
  }, // 关联权限表中的 rightId
  menuId: {
    type: Number,
    required: true,
  }, // 菜单ID
  btnId: {
    type: Number,
    required: true,
  }, // 按钮ID
  inputTime: {
    type: Date,
    default: Date.now,
  },
  updateTime: {
    type: Date,
    default: Date.now,
  },
});

const RightMapping = mongoose.model(
  'RightMapping',
  RightMappingSchema,
  'rightMappings'
);

module.exports = {
  RightMapping,
};
