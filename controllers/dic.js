// 创建申请状态（drrStatus）的字典映射
const drrStatusMap = {
  1: '待复核',
  2: '复核通过',
  3: '复核拒绝',
  4: '已撤销',
};

// 操作类型（drrOperType）的字典映射
const drrOperTypeMap = {
  1: '新增',
  2: '修改',
  3: '注销',
  4: '冻结',
  5: '解冻',
  6: '重置密码',
  7: '绑定证书',
  8: '分配权限',
};

// 复核类型（reviewType）的字典映射
const reviewTypeMap = {
  1: '新增',
  2: '修改',
  3: '查看',
};

module.exports = {
  drrStatusMap,
  drrOperTypeMap,
  reviewTypeMap,
};
