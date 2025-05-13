const mongoose = require('mongoose');
const { RightMapping } = require('../model/rightMapping');
const { getNextSequenceValue } = require('../utils/sequence');

const rightMappingAdd = async (rightId, mappings) => {
  try {
    for (const mapping of mappings) {
      // 获取下一个自增ID
      const id = await getNextSequenceValue('id');

      // 创建新的权限映射记录
      const newMapping = new RightMapping({
        id,
        rightId,
        menuId: mapping.menuId,
        btnId: mapping.btnId,
        inputTime: new Date(),
        updateTime: new Date(),
      });

      // 保存权限映射记录
      await newMapping.save();
      console.log('RightMapping saved', newMapping);
    }
  } catch (err) {
    console.error('Error saving right mappings:', err);
    throw err; // 抛出错误以便调用方处理
  }
};

module.exports = {
  rightMappingAdd,
};
