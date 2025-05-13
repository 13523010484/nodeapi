const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Right } = require('../model/right');
const { getNextSequenceValue } = require('../utils/sequence');
const SECRET_KEY = 'jqh-server-jwt';

const rightAdd = async (ctx, params) => {
  const token = ctx.request.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, SECRET_KEY);
  const rightId = await getNextSequenceValue('rightId');
  console.log('rightId::', rightId);

  const newUser = new Right({
    ...params,
    rightId,
    inputOperId: decoded.operCode,
    inputTime: new Date(), // 设置录入时间为当前时间
    updateTime: new Date(), // 设置更新时间为当前时间
  });
  const saveRight = await newUser.save();
  return saveRight;
};

module.exports = {
  rightAdd,
};
