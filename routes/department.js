const Router = require('koa-router');
const department = require('../controllers/department.js');
const router = new Router({
  prefix: '/api',
});

// 新增
router.post('/department/add', department.add);
// 查询
router.post('/department/query', department.query);
// 修改
router.post('/department/update', department.update);
// 删除
router.post('/department/remove', department.remove);
// 详情
router.get('/department/detail', department.detail);
// 下载
router.get('/department/download', department.download);
// 查询部门下的所有用户
router.post('/department/queryDeptUser', department.queryDeptUser);
// 部门名称
router.get('/department/deptName', department.deptName);

module.exports = router;
