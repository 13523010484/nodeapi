const mongoose = require('mongoose');

// 序列 Schema 定义
const SequenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

// 使用 Schema 创建模型
const Sequence = mongoose.model('Sequence', SequenceSchema, 'sequences');

module.exports = {
  Sequence,
};
