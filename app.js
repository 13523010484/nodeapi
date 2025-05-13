const Koa = require('koa');
const serve = require('koa-static');
const path = require('path');
const fs = require('fs').promises; // 使用 promises 版本的 fs
const { koaBody } = require('koa-body');
const jsonError = require('koa-json-error');
const parameter = require('koa-parameter');
const koajwt = require('koa-jwt');
const cors = require('@koa/cors'); // 新增：CORS 支持

const { connectDB } = require('./db/index.js');

const user = require('./routes/user.js');
const department = require('./routes/department.js');
const departmentApplication = require('./routes/departmentApplication.js');
const certificate = require('./routes/certificate.js');
const post = require('./routes/post.js');
const userApplication = require('./routes/userApplication.js');
const menu = require('./routes/menu.js');

const app = new Koa();

// ===== 添加 CORS 中间件 =====
app.use(
  cors({
    origin: 'http://localhost:8080', // 修改为你的前端地址
    credentials: true, // 允许携带 cookies 或 token
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// 静态资源中间件
app.use(serve(path.join(__dirname, 'uploads'))); // 上传文件目录
app.use(serve(path.join(__dirname, 'public'), { prefix: '/static' })); // 公共静态资源目录

// 处理根路径和 favicon.ico 请求
app.use(async (ctx, next) => {
  if (ctx.request.url === '/') {
    ctx.body = '<h1>Welcome to the Koa server</h1>';
    return;
  }

  if (ctx.request.url === '/favicon.ico') {
    ctx.type = 'image/x-icon';
    try {
      ctx.body = await fs.readFile(
        path.join(__dirname, 'public', 'favicon.ico')
      );
    } catch (err) {
      ctx.status = 404;
      ctx.body = 'Favicon not found';
    }
    return;
  }

  await next();
});

// JWT 校验中间件
app.use(
  koajwt({
    secret: 'jqh-server-jwt',
  }).unless({
    path: [
      /^\/api\/user\/login/, // 登录页面不做权限控制
      /^\/static\//, // public下的 static 开头的资源不做权限控制
      /^\/favicon\.ico$/, // favicon.ico 图标不做权限控制
    ],
  })
);

// 错误处理、body 解析、参数校验中间件
app.use(jsonError());
app.use(
  koaBody({
    multipart: true, // 支持文件上传
    formidable: {
      maxFileSize: 2000 * 1024 * 1024, // 限制文件上传大小，例如2GB
    },
  })
);
app.use(parameter(app));

// 连接数据库
connectDB();

// 注册路由
app.use(user.routes()).use(user.allowedMethods());
app.use(department.routes()).use(department.allowedMethods());
app
  .use(departmentApplication.routes())
  .use(departmentApplication.allowedMethods());
app.use(certificate.routes()).use(certificate.allowedMethods());
app.use(post.routes()).use(post.allowedMethods());
app.use(userApplication.routes()).use(userApplication.allowedMethods());
app.use(menu.routes()).use(menu.allowedMethods());

// 监听端口
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
