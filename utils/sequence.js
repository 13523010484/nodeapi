const { Sequence } = require('../model/sequence');
const idCache = {};
const cacheSize = 100; // 每次预取 100 个连续的 ID

// 获取唯一序列值，支持缓存和重试机制
async function getNextSequenceValue(sequenceName, maxRetries = 3) {
  if (!idCache[sequenceName] || idCache[sequenceName].length === 0) {
    try {
      // 更新数据库中的序列值，并获取新的范围
      const sequenceDoc = await Sequence.findOneAndUpdate(
        { name: sequenceName },
        { $inc: { seq: cacheSize } }, // 每次增加 cacheSize 个 ID
        { new: true, upsert: true } // 返回更新后的文档，并在不存在时插入
      );

      // 计算当前范围的起始和结束值
      const startSeq = sequenceDoc.seq - cacheSize + 1;
      const endSeq = sequenceDoc.seq;

      // 将连续的 ID 缓存到内存中
      idCache[sequenceName] = Array.from(
        { length: cacheSize },
        (_, i) => startSeq + i
      );
    } catch (error) {
      console.error(
        `Error fetching next sequence value for ${sequenceName}:`,
        error
      );
      throw error;
    }
  }

  // 从缓存中取出并移除第一个 ID，保证每个 ID 只被使用一次
  return idCache[sequenceName].shift();
}

module.exports = {
  getNextSequenceValue,
};
