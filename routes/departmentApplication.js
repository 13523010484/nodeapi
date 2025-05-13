const Router = require('koa-router');
const departmentApplication = require('../controllers/departmentApplication.js');
const router = new Router({
  prefix: '/api',
});

// 批量导入
router.post(
  '/departmentApplication/batchImport',
  departmentApplication.batchImport
);
// 待复核查询
router.post('/departmentApplication/query', departmentApplication.query);
// 已复核查询
router.post(
  '/departmentApplication/reviewedQuery',
  departmentApplication.reviewedQuery
);
// 查看复核通过
router.post(
  '/departmentApplication/viewReviewed',
  departmentApplication.viewReviewed
);
// 查看复核拒绝
router.post(
  '/departmentApplication/viewRejected',
  departmentApplication.viewRejected
);
// 录入复核通过
router.post(
  '/departmentApplication/inputReviewed',
  departmentApplication.inputReviewed
);
// 录入复核拒绝
router.post(
  '/departmentApplication/inputRejected',
  departmentApplication.inputRejected
);
// 撤销
router.post('/departmentApplication/revoke', departmentApplication.revoke);
// 详情
router.get('/departmentApplication/detail', departmentApplication.detail);
// 下载
router.get('/departmentApplication/download', departmentApplication.download);

module.exports = router;
