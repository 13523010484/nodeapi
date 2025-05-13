const Koa = require('koa');
const Router = require('koa-router');
const certificate = require('../controllers/certificate.js');
const router = new Router({
  prefix: '/api',
});

// 证书批量导入
router.post('/certificate/batchImport', certificate.batchImport);
// 证书查询
router.post('/certificate/query', certificate.query);
// 证书更新
router.post('/certificate/update', certificate.update);

module.exports = router;
