/**
 * 消息通知工具类
 * 支持多种推送方式：pushplus、serverchan、telegram、企业微信等
 */
const axios = require('axios');
const { config } = require('./config');

class Notify {
  constructor() {
    this.config = config.notification;
  }
  
  /**
   * 发送通知
   * @param {string} title - 通知标题
   * @param {string} content - 通知内容
   * @param {Object} params - 其他参数
   */
  async send(title, content, params = {}) {
    if (!this.config.enable) {
      console.log('消息推送未启用');
      return;
    }
    
    // 如果设置了仅出错时推送，检查是否有错误
    if (this.config.onlyError && !params.isError) {
      console.log('仅出错时推送，当前无错误，不推送消息');
      return;
    }
    
    // 根据配置的推送方式发送
    try {
      switch (this.config.type.toLowerCase()) {
        case 'pushplus':
          await this.pushPlusNotify(title, content);
          break;
        case 'serverchan':
          await this.serverChanNotify(title, content);
          break;
        case 'telegram':
          await this.telegramNotify(title, content);
          break;
        case 'wecom':
          await this.wecomNotify(title, content);
          break;
        case 'pushme':
          await this.pushMeNotify(title, content);
          break;
        default:
          console.log(`不支持的推送方式: ${this.config.type}`);
      }
    } catch (error) {
      console.error(`消息推送失败: ${error.message}`);
    }
  }
  
  /**
   * PushPlus推送
   * @param {string} title - 通知标题
   * @param {string} content - 通知内容
   */
  async pushPlusNotify(title, content) {
    const { token } = this.config.pushplus;
    if (!token) {
      console.error('PushPlus token未配置');
      return;
    }
    
    try {
      const url = 'http://www.pushplus.plus/send';
      const data = {
        token,
        title,
        content,
        template: 'html'
      };
      
      const response = await axios.post(url, data);
      if (response.data.code === 200) {
        console.log('PushPlus消息推送成功');
      } else {
        console.error(`PushPlus消息推送失败: ${response.data.msg}`);
      }
    } catch (error) {
      console.error(`PushPlus消息推送异常: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Server酱推送
   * @param {string} title - 通知标题
   * @param {string} content - 通知内容
   */
  async serverChanNotify(title, content) {
    const { sendkey } = this.config.serverchan;
    if (!sendkey) {
      console.error('Server酱 SendKey未配置');
      return;
    }
    
    try {
      const url = `https://sctapi.ftqq.com/${sendkey}.send`;
      const data = {
        title,
        desp: content
      };
      
      const response = await axios.post(url, data);
      if (response.data.code === 0) {
        console.log('Server酱消息推送成功');
      } else {
        console.error(`Server酱消息推送失败: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Server酱消息推送异常: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Telegram推送
   * @param {string} title - 通知标题
   * @param {string} content - 通知内容
   */
  async telegramNotify(title, content) {
    const { botToken, chatId } = this.config.telegram;
    if (!botToken || !chatId) {
      console.error('Telegram配置不完整');
      return;
    }
    
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const data = {
        chat_id: chatId,
        text: `${title}\n\n${content}`,
        parse_mode: 'HTML'
      };
      
      const response = await axios.post(url, data);
      if (response.data.ok) {
        console.log('Telegram消息推送成功');
      } else {
        console.error(`Telegram消息推送失败: ${response.data.description}`);
      }
    } catch (error) {
      console.error(`Telegram消息推送异常: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 企业微信推送
   * @param {string} title - 通知标题
   * @param {string} content - 通知内容
   */
  async wecomNotify(title, content) {
    const { agentId, corpId, corpSecret, toUser } = this.config.wecom;
    if (!agentId || !corpId || !corpSecret) {
      console.error('企业微信配置不完整');
      return;
    }
    
    try {
      // 获取访问令牌
      const tokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${corpSecret}`;
      const tokenRes = await axios.get(tokenUrl);
      if (tokenRes.data.errcode !== 0) {
        console.error(`企业微信获取Token失败: ${tokenRes.data.errmsg}`);
        return;
      }
      
      const accessToken = tokenRes.data.access_token;
      const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`;
      const data = {
        touser: toUser,
        msgtype: 'text',
        agentid: agentId,
        text: {
          content: `${title}\n\n${content}`
        }
      };
      
      const response = await axios.post(url, data);
      if (response.data.errcode === 0) {
        console.log('企业微信消息推送成功');
      } else {
        console.error(`企业微信消息推送失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      console.error(`企业微信消息推送异常: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * PushMe推送
   * @param {string} title - 通知标题
   * @param {string} content - 通知内容
   */
  async pushMeNotify(title, content) {
    const { key } = this.config.pushme;
    if (!key) {
      console.error('PushMe key未配置');
      return;
    }
    
    try {
      const url = 'https://push.i-i.me/';
      const data = {
        key,
        title,
        content
      };
      
      const response = await axios.post(url, data);
      if (response.data.code === 200) {
        console.log('PushMe消息推送成功');
      } else {
        console.error(`PushMe消息推送失败: ${response.data.msg}`);
      }
    } catch (error) {
      console.error(`PushMe消息推送异常: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 获取HTML格式的消息内容
   * @param {Object} data - 消息数据
   */
  static getHtmlContent(data) {
    if (!data) return '';
    
    let content = '<div style="font-family: Arial, sans-serif; line-height: 1.6;">';
    
    // 添加用户信息
    if (data.user) {
      const { uname, uid, level, coins } = data.user;
      content += `<div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">`;
      content += `<h3 style="margin-top: 0; color: #00a1d6;">用户信息</h3>`;
      content += `<p>用户名: <strong>${uname}</strong></p>`;
      content += `<p>UID: <strong>${uid}</strong></p>`;
      content += `<p>等级: <strong>${level}</strong></p>`;
      content += `<p>硬币: <strong>${coins}</strong></p>`;
      content += `</div>`;
    }
    
    // 添加任务信息
    if (data.tasks && data.tasks.length > 0) {
      content += `<div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">`;
      content += `<h3 style="margin-top: 0; color: #00a1d6;">任务信息</h3>`;
      content += `<ul style="list-style-type: none; padding-left: 0;">`;
      
      for (const task of data.tasks) {
        const emoji = task.status === 'success' ? '✅' : (task.status === 'skip' ? '⏭️' : '❌');
        const color = task.status === 'success' ? '#4caf50' : (task.status === 'skip' ? '#ff9800' : '#f44336');
        
        content += `<li style="margin-bottom: 10px; padding: 10px; border-radius: 5px; background-color: #ffffff; border-left: 5px solid ${color};">`;
        content += `<span style="font-weight: bold; display: inline-block; width: 150px;">${emoji} ${task.name}:</span>`;
        content += `<span>${task.message}</span>`;
        content += `</li>`;
      }
      
      content += `</ul>`;
      content += `</div>`;
    }
    
    // 添加统计信息
    if (data.stats) {
      content += `<div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">`;
      content += `<h3 style="margin-top: 0; color: #00a1d6;">统计信息</h3>`;
      
      Object.entries(data.stats).forEach(([key, value]) => {
        content += `<p>${key}: <strong>${value}</strong></p>`;
      });
      
      content += `</div>`;
    }
    
    // 添加错误信息
    if (data.errors && data.errors.length > 0) {
      content += `<div style="background-color: #ffd7d7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">`;
      content += `<h3 style="margin-top: 0; color: #d32f2f;">错误信息</h3>`;
      content += `<ul>`;
      
      for (const error of data.errors) {
        content += `<li style="margin-bottom: 5px;">${error}</li>`;
      }
      
      content += `</ul>`;
      content += `</div>`;
    }
    
    // 添加执行时间
    if (data.executionTime) {
      content += `<div style="color: #757575; font-size: 12px; margin-top: 20px;">`;
      content += `<p>执行时间: ${data.executionTime}</p>`;
      content += `</div>`;
    }
    
    content += '</div>';
    return content;
  }
}

module.exports = Notify; 