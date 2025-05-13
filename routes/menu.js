const Koa = require('koa');
const Router = require('koa-router');
const menu = require('../controllers/menu.js');
const router = new Router({
  prefix: '/api',
});

// 菜单初始化
router.post('/menu/init', menu.init);
// 菜单查询
router.post('/menu/query', menu.query);

module.exports = router;
