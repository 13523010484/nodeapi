const { Sequence } = require('../model/sequence');
const idCache = {};
const cacheSize = 100; // 每次预取 100 个 id

// 获取唯一序列值，支持缓存和重试机制
async function getNextSequenceValue(sequenceName, maxRetries = 3) {
  if (!idCache[sequenceName] || idCache[sequenceName].length === 0) {
    const sequenceDoc = await Sequence.findOneAndUpdate(
      { name: sequenceName },
      { $inc: { seq: cacheSize } },
      { new: true, upsert: true }
    );
    const startSeq = sequenceDoc.seq - cacheSize + 1;
    const endSeq = sequenceDoc.seq;
    idCache[sequenceName] = Array.from(
      { length: cacheSize },
      (_, i) => startSeq + i
    );
  }

  return idCache[sequenceName].shift();
}

module.exports = {
  getNextSequenceValue,
};
