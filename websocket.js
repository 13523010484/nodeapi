// // websocket.js
// /**
//  * 下面的代码是供前端测试 websocket 功能
//  * **/
// const Koa = require('koa');
// const WebSocket = require('ws');
// const { v4: uuidv4 } = require('uuid');

// const app = new Koa();
// const wss = new WebSocket.Server({
//   host: 'localhost', // 地址
//   port: 8083, // 端口
//   path: '/websocket',
//   // 如果需要支持特定的子协议，可以在这里定义
//   // 例如：'protocols': ['echo-protocol']
// });

// // 存储所有连接的客户端
// const clients = new Set();

// wss.on('connection', (ws) => {
//   // 新客户端连接时添加到clients集合中
//   clients.add(ws);

//   console.log('WebSocket connection opened');
//   ws.on('message', (message) => {
//     console.log('Received message from client:', message);
//     try {
//       console.log('clients::', clients);
//       // 将接收到的字符串转换为JSON对象
//       const data = JSON.parse(message);
//       // 在此处处理接收到的JSON数据
//       console.log('Received data:', data);

//       const response = {
//         status: '200',
//         message: 'success',
//         data: {
//           id: uuidv4(),
//           value: data.value,
//         },
//       };

//       // 将响应的JSON对象转换为字符串并通过WebSocket发送
//       ws.send(JSON.stringify(response));
//     } catch (error) {
//       console.error('Error parsing JSON:', error);
//       // 如果解析失败，发送错误消息回客户端
//       ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
//     }
//   });

//   ws.on('close', () => {
//     // 客户端关闭连接时从clients集合中移除
//     clients.delete(ws);
//     console.log('WebSocket connection closed');
//   });

//   ws.on('error', (error) => {
//     console.error('WebSocket error:', error);
//   });
// });

// // 假设这个函数会在数据状态改变时被调用
// function onDataStateChange(newData) {
//   // 遍历所有客户端连接并发送消息
//   for (const client of clients) {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(
//         JSON.stringify({
//           status: '200',
//           message: 'success',
//           data: {
//             id: uuidv4(),
//             value: '数据发生改变啦...',
//           },
//         })
//       ); // 发送新数据到客户端
//     }
//   }
// }

// // 示例：模拟数据状态改变并推送消息
// setInterval(() => {
//   const newData = { status: 'updated', value: 'New Value' };
//   onDataStateChange(newData); // 模拟数据状态改变，并向所有客户端推送消息
// }, 20000); // 5秒后模拟数据改变

// app.use(async (ctx) => {
//   ctx.body = 'Hello, Koa!';
// });

// app.listen(3000, () => {
//   console.log('Server is running on port 3000');
// });
