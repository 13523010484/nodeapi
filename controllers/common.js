const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { User } = require('../model/user');
const SECRET_KEY = 'jqh-server-jwt';

/**
 * 获取用户信息
 * @param {string} token - 用户的 JWT token
 * @returns {Promise<Object>} 用户信息对象
 */
const getUserInfo = async (ctx) => {
  const token = ctx.request.headers.authorization?.split(' ')[1];
  if (!token) {
    throw new Error('未提供Token');
  }

  let operCode;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    operCode = decoded.operCode;
  } catch (err) {
    throw new Error('无效的Token');
  }

  const user = await User.findOne({ operCode }).select('-password');
  if (!user) {
    throw new Error('用户未找到');
  }

  return {
    operId: user.operId,
    operCode: user.operCode,
    operName: user.operName,
    memCode: user.memCode,
    deptId: user.deptId,
    officeTel: user.officeTel,
    mobile: user.mobile,
    updateOperName: user.updateOperName,
    posiType: user.posiType,
    remark: user.remark,
    operStatus: user.operStatus,
    operType: user.operType,
    inputOperId: user.inputOperId,
    updateOperId: user.updateOperId,
    reviewOperId: user.reviewOperId,
    avatar: user.avatar,
    inputTm: user.inputTm,
    updateTm: user.updateTm,
    reviewTm: user.reviewTm,
  };
};

module.exports = {
  getUserInfo,
};
