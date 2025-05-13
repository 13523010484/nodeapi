const Router = require('koa-router');
const post = require('../controllers/post.js');
const router = new Router({
  prefix: '/api',
});

// 批量导入
router.post('/post/batchImport', post.batchImport);
// 岗位新增
router.post('/post/add', post.add);
// 岗位修改
router.post('/post/update', post.update);
// 岗位删除
router.post('/post/remove', post.remove);
// 详情
router.get('/post/detail', post.detail);
// 待复核查询
router.post('/post/query', post.query);
// 已复核查询
router.post('/post/reviewedQuery', post.reviewedQuery);
// 复核
router.post('/post/review', post.review);
// 撤销
router.post('/post/revoke', post.revoke);
// 下载
router.get('/post/download', post.download);
// 岗位名称
router.post('/post/postName', post.postName);
// 权限 id
router.post('/post/permissionId', post.permissionId);
// 查询岗位下的用户
router.post('/post/queryPostUser', post.queryPostUser);
// 查询岗位下的权限
router.post('/post/queryPostAuth', post.queryPostAuth);

module.exports = router;
