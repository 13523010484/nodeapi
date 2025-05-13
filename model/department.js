const mongoose = require('mongoose');

// 部门表 Schema 定义
const DepartmentSchema = new mongoose.Schema({
  // 部门编号
  deptId: {
    type: Number,
    required: true,
    unique: true,
  },
  // 部门名称
  deptName: {
    type: String,
    default: '',
  },
  // 所属机构
  memCode: {
    type: String,
    default: '',
  },
  // 备注
  remark: {
    type: String,
    default: '',
  },
  inputTime: {
    type: Date,
    default: Date.now,
  }, // 录入时间
  updateTime: {
    type: Date,
    default: Date.now,
  }, // 更新时间
  // 部门状态
  deptStatus: {
    type: Number,
    default: 1,
  },
  // 父级部门
  parentDept: {
    type: String,
    default: '',
  },
  // 录入人
  inputOperName: {
    type: String,
    default: '',
  },
  // 更新人
  updateOperName: {
    type: String,
    default: '',
  },
  // 更新时间
  updateTm: {
    type: String,
    default: '',
  },
  // 复核人
  reviewOperName: {
    type: String,
    default: '',
  },
  // 复核时间
  reviewTm: {
    type: String,
    default: '',
  },
});

// 使用 Schema 创建模型，注意模型名称首字母大写，Mongoose 会自动处理复数形式
const Department = mongoose.model(
  'Department',
  DepartmentSchema,
  'departments'
);

module.exports = {
  Department,
};
