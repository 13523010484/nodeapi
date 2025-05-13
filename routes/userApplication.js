const Router = require('koa-router');
const userApplication = require('../controllers/userApplication.js');
const router = new Router({
  prefix: '/api',
});

// 批量导入
router.post('/userApplication/batchImport', userApplication.batchImport);
// 待复核查询
router.post('/userApplication/query', userApplication.query);
// 已复核查询
router.post('/userApplication/reviewedQuery', userApplication.reviewedQuery);
// 查看复核通过
router.post('/userApplication/viewReviewed', userApplication.viewReviewed);
// 查看复核拒绝
router.post('/userApplication/viewRejected', userApplication.viewRejected);
// 录入复核通过
router.post('/userApplication/inputReviewed', userApplication.inputReviewed);
// 录入复核拒绝
router.post('/userApplication/inputRejected', userApplication.inputRejected);
// 撤销
router.post('/userApplication/revoke', userApplication.revoke);
// 详情
router.get('/userApplication/detail', userApplication.detail);
// 录入复核详情
router.get(
  '/userApplication/inputReviewDetail',
  userApplication.inputReviewDetail
);
// 下载
router.get('/userApplication/download', userApplication.download);

module.exports = router;
