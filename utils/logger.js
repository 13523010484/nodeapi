const winston = require('winston');
require('winston-daily-rotate-file');

// 定义日志级别和颜色
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
  },
};

// 应用日志颜色
winston.addColors(logLevels.colors);

// 创建日志器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // 默认日志级别为 info
  levels: logLevels.levels, // 自定义日志级别
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // 添加时间戳
    winston.format.colorize(), // 控制台输出带颜色
    winston.format.splat(), // 支持数组和对象格式化
    winston.format.printf(
      (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
    ) // 自定义日志格式
  ),
  transports: [
    // 输出到控制台
    new winston.transports.Console({
      level: 'debug', // 控制台显示更多日志
      handleExceptions: true, // 捕获未捕获的异常
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // 输出到每日轮转文件
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log', // 日志文件名
      datePattern: 'YYYY-MM-DD', // 文件日期格式
      zippedArchive: true, // 是否压缩旧日志
      maxSize: '20m', // 单个文件最大大小
      maxFiles: '14d', // 最大保留天数
      level: 'info', // 文件日志级别
    }),
  ],
  exceptionHandlers: [
    // 异常日志处理
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  exitOnError: false, // 防止日志错误导致程序退出
});

// 创建一个方法来记录未捕获的异常
process.on('uncaughtException', (ex) => {
  logger.error('Uncaught Exception:', ex);
  process.exit(1); // 强制退出进程
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // 强制退出进程
});

// 导出日志器
module.exports = logger;
