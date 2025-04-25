/**
 * HTTP请求工具类
 * 封装了axios请求，包含cookie处理和请求签名
 */
const axios = require('axios');
const crypto = require('crypto-js');
const { CookieJar } = require('tough-cookie');
const { config, USER_AGENTS, APP_VERSION } = require('./config');

class Request {
  constructor(cookie = '') {
    this.cookie = cookie;
    this.cookieJar = new CookieJar();
    this.userAgent = this.getRandomUA();
    this.parseCookieIntoCookieJar();
    
    // 创建axios实例
    this.instance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': this.userAgent,
        'Cookie': this.cookie,
        'Content-Type': 'application/json',
        'Referer': 'https://www.bilibili.com/',
        'Accept': 'application/json, text/plain, */*',
        'Connection': 'keep-alive'
      }
    });
    
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        if (config.method === 'get' && config.params) {
          // 添加时间戳防止缓存
          config.params._ = new Date().getTime();
        }
        
        // 添加APP相关请求头
        if (config.useAppHeader) {
          const appInfo = this.getAppInfo();
          config.headers = {
            ...config.headers,
            'x-bili-aurora-eid': this.generateEid(),
            'x-bili-aurora-zone': 'sh001',
            'x-bili-mid': this.getUserId(),
            'x-bili-metadata-bin': this.getMetadataBin(),
            'x-bili-device-bin': this.getDeviceBin(),
            'x-bili-trace-id': this.generateTraceId(),
            'x-bili-locale-bin': this.getLocaleBin(),
            'x-bili-network-bin': this.getNetworkBin(),
            'x-bili-fawkes-req-bin': this.getFawkesReqBin(),
            'Build': appInfo.buildCode,
            'env': 'prod',
            'APP-KEY': 'android64',
          };
        }
        
        // 添加签名
        if (config.sign) {
          const signData = this.sign(config.url, config.params || {});
          config.params = {
            ...config.params,
            ...signData
          };
        }
        
        // 添加调试日志
        if (config.debug?.verbose) {
          console.log(`[Request] ${config.method.toUpperCase()} ${config.url}`);
          console.log('Headers:', config.headers);
          if (config.params) console.log('Params:', config.params);
          if (config.data) console.log('Data:', config.data);
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => {
        // 更新Cookie
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
          this.updateCookie(setCookie);
        }
        
        // 添加调试日志
        if (config.debug?.verbose) {
          console.log(`[Response] ${response.status} ${response.config.url}`);
          console.log('Data:', response.data);
        }
        
        // 保存日志
        if (config.debug?.saveRequestLog) {
          this.saveLog({
            url: response.config.url,
            method: response.config.method,
            params: response.config.params,
            data: response.config.data,
            response: response.data
          });
        }
        
        return response;
      },
      (error) => {
        console.error(`请求失败: ${error.message}`);
        if (error.response) {
          console.error(`状态码: ${error.response.status}`);
          console.error(`响应数据: ${JSON.stringify(error.response.data)}`);
        }
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * 获取随机用户代理
   */
  getRandomUA() {
    if (!config.behavior.randomUA) {
      return USER_AGENTS[0];
    }
    const randomIndex = Math.floor(Math.random() * USER_AGENTS.length);
    return USER_AGENTS[randomIndex];
  }
  
  /**
   * 解析cookie字符串并添加到cookie jar
   */
  parseCookieIntoCookieJar() {
    if (!this.cookie) return;
    
    const cookiePairs = this.cookie.split(';');
    for (const pair of cookiePairs) {
      const [name, value] = pair.trim().split('=');
      if (name && value) {
        this.cookieJar.setCookieSync(
          `${name}=${value}`,
          'https://bilibili.com'
        );
      }
    }
  }
  
  /**
   * 从cookie中提取用户ID
   */
  getUserId() {
    if (!this.cookie) return '';
    
    const match = this.cookie.match(/DedeUserID=(\d+)/);
    return match ? match[1] : '';
  }
  
  /**
   * 更新Cookie
   * @param {Array} setCookie - 服务器返回的Set-Cookie头
   */
  updateCookie(setCookie) {
    if (!setCookie || !Array.isArray(setCookie)) return;
    
    for (const cookie of setCookie) {
      this.cookieJar.setCookieSync(cookie, 'https://bilibili.com');
    }
    
    // 更新实例的cookie
    this.cookie = this.cookieJar.getCookieStringSync('https://bilibili.com');
    this.instance.defaults.headers.Cookie = this.cookie;
  }
  
  /**
   * 获取APP信息
   */
  getAppInfo() {
    // 随机选择平台
    const platforms = ['android', 'ios'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    return APP_VERSION[platform];
  }
  
  /**
   * 生成随机的EID
   */
  generateEid() {
    return Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
  }
  
  /**
   * 生成Trace ID
   */
  generateTraceId() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return timestamp + random;
  }
  
  /**
   * 请求签名
   * @param {string} url - 请求URL
   * @param {Object} params - 请求参数
   */
  sign(url, params = {}) {
    const appKey = '783bbb7264451d82';
    const appSec = '2653583c8873dea268ab9386918b1d65';
    
    // 添加公共参数
    const signParams = {
      ...params,
      appkey: appKey,
      ts: Math.floor(Date.now() / 1000)
    };
    
    // 参数按照key升序排序
    const sortedParams = Object.keys(signParams)
      .sort()
      .reduce((result, key) => {
        result[key] = signParams[key];
        return result;
      }, {});
    
    // 拼接参数
    let queryString = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    // 计算签名
    const sign = crypto.MD5(queryString + appSec).toString();
    
    return {
      ...sortedParams,
      sign
    };
  }
  
  /**
   * 获取元数据二进制
   */
  getMetadataBin() {
    return Buffer.from('metadata').toString('base64');
  }
  
  /**
   * 获取设备信息二进制
   */
  getDeviceBin() {
    return Buffer.from('device').toString('base64');
  }
  
  /**
   * 获取本地化二进制
   */
  getLocaleBin() {
    return Buffer.from('locale').toString('base64');
  }
  
  /**
   * 获取网络二进制
   */
  getNetworkBin() {
    return Buffer.from('network').toString('base64');
  }
  
  /**
   * 获取Fawkes请求二进制
   */
  getFawkesReqBin() {
    return Buffer.from('fawkes').toString('base64');
  }
  
  /**
   * 保存日志
   * @param {Object} logData - 日志数据
   */
  saveLog(logData) {
    // 实际项目中可以将日志保存到文件
    console.log('[Log]', JSON.stringify(logData, null, 2));
  }
  
  /**
   * GET请求
   * @param {string} url - 请求URL
   * @param {Object} params - 请求参数
   * @param {Object} options - 其他选项
   */
  async get(url, params = {}, options = {}) {
    try {
      const response = await this.instance.get(url, {
        params,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error(`GET请求失败: ${url}`, error.message);
      throw error;
    }
  }
  
  /**
   * POST请求
   * @param {string} url - 请求URL
   * @param {Object} data - 请求体数据
   * @param {Object} options - 其他选项
   */
  async post(url, data = {}, options = {}) {
    try {
      const response = await this.instance.post(url, data, options);
      return response.data;
    } catch (error) {
      console.error(`POST请求失败: ${url}`, error.message);
      throw error;
    }
  }
  
  /**
   * 随机延迟
   */
  async randomDelay() {
    if (!config.behavior.realBehavior) return;
    
    const { min, max } = config.behavior.delay;
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    
    return new Promise(resolve => setTimeout(resolve, delay * 1000));
  }
}

module.exports = Request; 