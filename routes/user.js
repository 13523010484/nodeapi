const Koa = require('koa');
const Router = require('koa-router');
const user = require('../controllers/user.js');
const router = new Router({
  prefix: '/api',
});

// 登录
router.post('/user/login', user.login);
// 获取用户信息
router.get('/user/userInfo', user.userInfo);
// 查询权限菜单
router.post('/user/permission', user.permission);
// 退出登录
router.get('/user/logout', user.logout);
// 用户批量导入
router.post('/user/batchImport', user.batchImport);
// 用户新增
router.post('/user/add', user.add);
// 用户查询
router.post('/user/query', user.query);
// 用户更新
router.post('/user/update', user.update);
// 用户下载
router.get('/user/download', user.download);
// 用户冻结
router.post('/user/freeze', user.freeze);
// 用户解冻
router.post('/user/notFrozen', user.notFrozen);
// 用户注销
router.post('/user/userLogout', user.userLogout);
// 用户重置密码
router.post('/user/resetPassword', user.resetPassword);
// 用户添加证书
router.post('/user/addCertificate', user.addCertificate);
// 用户查询证书
router.post('/user/queryCertificate', user.queryCertificate);
// 用户删除证书
router.post('/user/deleteCertificate', user.deleteCertificate);
// 用户增加岗位
router.post('/user/bindPost', user.bindPost);
// 上传头像
router.post('/user/uploadAvatar', user.uploadAvatar);
// 部门管理员查询
router.post('/user/adminQuery', user.adminQuery);
// 部门管理员新增
router.post('/user/adminAdd', user.adminAdd);
// 部门管理员详情
router.get('/user/adminDetail', user.adminDetail);
// 部门管理员更新
router.post('/user/adminUpdate', user.adminUpdate);
// 部门管理员删除
router.post('/user/adminRemove', user.adminRemove);
// 部门管理员密码重置
router.post('/user/adminResetPassword', user.adminResetPassword);
// 部门管理员下载
router.get('/user/adminDownload', user.adminDownload);
// 部门操作员查询
router.post('/user/operateQuery', user.operateQuery);
// 部门操作员新增
router.post('/user/operateAdd', user.operateAdd);
// 部门操作员详情
router.get('/user/operateDetail', user.operateDetail);
// 部门操作员更新
router.post('/user/operateUpdate', user.operateUpdate);
// 部门操作员删除
router.post('/user/operateRemove', user.operateRemove);
// 部门操作员密码重置
router.post('/user/operateResetPassword', user.operateResetPassword);
// 部门操作员下载
router.get('/user/operateDownload', user.operateDownload);

module.exports = router;
