const mongoose = require('mongoose');

// 部门表 Schema 定义
const DepartmentApplicationSchema = new mongoose.Schema({
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
  // 操作类型
  drrOperType: {
    type: String,
    default: '',
  },
  // 部门编号
  deptId: {
    type: String,
    default: '',
  },
  // 部门名称
  deptName: {
    type: String,
    default: '',
  },
  // 备注
  remark: {
    type: String,
    default: '',
  },
  // 申请状态
  drrStatus: {
    type: String,
    default: '',
  },
  // 申请人
  inputOperName: {
    type: String,
    default: '',
  },
  // // 申请时间
  // drrDate: {
  //   type: String,
  //   default: '',
  // },
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
  // 撤销时间
  revokeTm: {
    type: String,
    default: '',
  },
});

// 使用 Schema 创建模型，注意模型名称首字母大写，Mongoose 会自动处理复数形式
const DepartmentApplication = mongoose.model(
  'DepartmentApplication',
  DepartmentApplicationSchema,
  'departmentApplications'
);

module.exports = {
  DepartmentApplication,
};
