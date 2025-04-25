/**
 * 通用工具函数
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto-js');
const moment = require('moment');

/**
 * 随机整数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} - 随机整数
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * 随机休眠
 * @param {number} min - 最小值(秒)
 * @param {number} max - 最大值(秒)
 * @returns {Promise} - 休眠Promise
 */
function sleep(min, max) {
  const seconds = randomInt(min, max);
  console.log(`随机休眠 ${seconds} 秒...`);
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * 获取环境变量
 * @param {string} key - 环境变量名
 * @param {string} defaultValue - 默认值
 * @returns {string} - 环境变量值
 */
function getEnv(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

/**
 * 获取哔哩哔哩Cookie
 * @returns {Array} - Cookie数组
 */
function getBiliCookies() {
  const cookieString = getEnv('BILIBILI_COOKIE', '');
  if (!cookieString) {
    console.log('未配置Cookie，请在环境变量中添加BILIBILI_COOKIE');
    return [];
  }
  
  return cookieString.split('&').filter(item => item.trim());
}

/**
 * 获取推送方式
 * @returns {string} - 推送方式
 */
function getPushType() {
  return getEnv('BILIBILI_PUSH', '');
}

/**
 * MD5加密
 * @param {string} text - 要加密的文本
 * @returns {string} - 加密后的文本
 */
function md5(text) {
  return crypto.MD5(text).toString();
}

/**
 * 格式化日期时间
 * @param {Date} date - 日期对象
 * @param {string} format - 格式
 * @returns {string} - 格式化后的日期字符串
 */
function formatDate(date = new Date(), format = 'YYYY-MM-DD HH:mm:ss') {
  return moment(date).format(format);
}

/**
 * 生成UUID
 * @returns {string} - UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 提取CSRF Token
 * @param {string} cookie - Cookie字符串
 * @returns {string} - CSRF Token
 */
function extractCSRF(cookie) {
  const match = cookie.match(/bili_jct=([^;]+)/);
  return match ? match[1] : '';
}

/**
 * 提取DedeUserID
 * @param {string} cookie - Cookie字符串
 * @returns {string} - DedeUserID
 */
function extractDedeUserID(cookie) {
  const match = cookie.match(/DedeUserID=([^;]+)/);
  return match ? match[1] : '';
}

/**
 * 提取SESSDATA
 * @param {string} cookie - Cookie字符串
 * @returns {string} - SESSDATA
 */
function extractSESSDATA(cookie) {
  const match = cookie.match(/SESSDATA=([^;]+)/);
  return match ? match[1] : '';
}

/**
 * 保存数据到文件
 * @param {string} fileName - 文件名
 * @param {any} data - 要保存的数据
 */
function saveToFile(fileName, data) {
  try {
    const filePath = path.join(process.cwd(), fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`数据已保存到 ${filePath}`);
  } catch (error) {
    console.error(`保存数据失败: ${error.message}`);
  }
}

/**
 * 从文件读取数据
 * @param {string} fileName - 文件名
 * @returns {any} - 读取的数据
 */
function readFromFile(fileName) {
  try {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取数据失败: ${error.message}`);
    return null;
  }
}

/**
 * 计算百分比
 * @param {number} numerator - 分子
 * @param {number} denominator - 分母
 * @returns {string} - 百分比字符串
 */
function calculatePercentage(numerator, denominator) {
  if (!denominator) return '0%';
  return Math.floor((numerator / denominator) * 100) + '%';
}

/**
 * 格式化时间差
 * @param {number} milliseconds - 毫秒数
 * @returns {string} - 格式化后的时间
 */
function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟${seconds % 60}秒`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

module.exports = {
  randomInt,
  sleep,
  getEnv,
  getBiliCookies,
  getPushType,
  md5,
  formatDate,
  generateUUID,
  extractCSRF,
  extractDedeUserID,
  extractSESSDATA,
  saveToFile,
  readFromFile,
  calculatePercentage,
  formatDuration
};