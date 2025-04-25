/**
 * 哔哩哔哩漫画签到脚本
 * 实现漫画签到相关功能
 */

const Request = require('../utils/request');
const { BILIBILI_API } = require('../utils/config');
const { sleep, extractCSRF, getBiliCookies, formatDate } = require('../utils/common');
const Notify = require('../utils/notify');

// 通知对象
const notify = new Notify();

// 任务结果
const results = {
  success: [],
  failed: [],
  skipped: []
};

/**
 * 获取用户信息
 * @param {Request} request - 请求对象
 */
async function getUserInfo(request) {
  try {
    const response = await request.get(BILIBILI_API.login.userInfo);
    if (response.code === 0 && response.data) {
      const { uname, mid: uid, level_info, money } = response.data;
      return {
        uname,
        uid,
        level: level_info.current_level,
        coins: money,
      };
    } else {
      throw new Error(`获取用户信息失败: ${response.message}`);
    }
  } catch (error) {
    console.error(`获取用户信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 漫画签到
 * @param {Request} request - 请求对象
 * @param {string} csrf - CSRF令牌
 */
async function mangaSign(request, csrf) {
  try {
    const response = await request.post(BILIBILI_API.manga.sign, {
      platform: 'android'
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://manga.bilibili.com/',
      }
    });
    
    // 对象形式的响应
    if (typeof response === 'object') {
      if (response.code === 0) {
        return {
          status: true,
          message: '漫画签到成功'
        };
      } else if (response.code === 'invalid_argument') {
        return {
          status: true,
          message: '今日已完成漫画签到'
        };
      } else {
        return {
          status: false,
          message: `漫画签到失败: ${response.msg || '未知错误'}`
        };
      }
    }
    
    // 字符串形式的响应
    if (typeof response === 'string') {
      try {
        const jsonResponse = JSON.parse(response);
        if (jsonResponse.code === 0) {
          return {
            status: true,
            message: '漫画签到成功'
          };
        } else if (jsonResponse.code === 'invalid_argument') {
          return {
            status: true,
            message: '今日已完成漫画签到'
          };
        } else {
          return {
            status: false,
            message: `漫画签到失败: ${jsonResponse.msg || '未知错误'}`
          };
        }
      } catch (e) {
        return {
          status: false,
          message: `漫画签到失败，无法解析响应: ${response}`
        };
      }
    }
    
    return {
      status: false,
      message: '漫画签到失败，未知响应'
    };
  } catch (error) {
    console.error(`漫画签到请求失败: ${error.message}`);
    return {
      status: false,
      message: `漫画签到失败: ${error.message}`
    };
  }
}

/**
 * 执行任务
 */
async function runTask() {
  console.log(`\n=================== 哔哩哔哩漫画签到 - ${formatDate()} ===================`);
  
  // 获取Cookie
  const cookies = getBiliCookies();
  
  if (cookies.length === 0) {
    const message = '未配置 BILIBILI_COOKIE 环境变量，请先配置';
    console.log(message);
    await notify.send('哔哩哔哩漫画签到失败', message, { isError: true });
    return;
  }
  
  // 遍历执行每个账号
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const csrf = extractCSRF(cookie);
    
    if (!csrf) {
      console.log(`账号 ${i + 1} 未包含bili_jct，无法执行签到，跳过`);
      results.skipped.push(`账号 ${i + 1}: 缺少CSRF令牌`);
      continue;
    }
    
    const request = new Request(cookie);
    
    try {
      console.log(`\n===== 开始账号 ${i + 1} =====`);
      
      // 获取用户信息
      const userInfo = await getUserInfo(request);
      console.log(`用户名: ${userInfo.uname}, UID: ${userInfo.uid}, 等级: ${userInfo.level}, 硬币: ${userInfo.coins}`);
      
      // 随机延迟
      await sleep(2, 5);
      
      // 执行漫画签到
      const signResult = await mangaSign(request, csrf);
      
      if (signResult.status) {
        console.log(`✓ ${signResult.message}`);
        results.success.push({
          uid: userInfo.uid,
          uname: userInfo.uname,
          message: signResult.message
        });
      } else {
        console.log(`✗ ${signResult.message}`);
        results.failed.push({
          uid: userInfo.uid,
          uname: userInfo.uname,
          message: signResult.message
        });
      }
      
      // 随机延迟，避免请求过快
      if (i < cookies.length - 1) {
        await sleep(5, 10);
      }
    } catch (error) {
      console.error(`账号 ${i + 1} 执行失败: ${error.message}`);
      results.failed.push(`账号 ${i + 1}: ${error.message}`);
    }
  }
  
  // 任务结束统计
  console.log('\n===== 任务统计 =====');
  console.log(`✓ 成功数量: ${results.success.length}`);
  console.log(`✗ 失败数量: ${results.failed.length}`);
  console.log(`⏭ 跳过数量: ${results.skipped.length}`);
  
  // 发送通知
  const title = '哔哩哔哩漫画签到';
  
  // 构建通知内容
  let notifyContent = '';
  let isError = results.failed.length > 0;
  
  // 格式化HTML内容
  const notifyData = {
    tasks: [],
    stats: {
      '总账号数': cookies.length,
      '成功数量': results.success.length,
      '失败数量': results.failed.length,
      '跳过数量': results.skipped.length
    },
    executionTime: formatDate()
  };
  
  // 添加成功任务
  results.success.forEach(item => {
    notifyData.tasks.push({
      name: '漫画签到',
      status: 'success',
      message: `${item.uname}(${item.uid}): ${item.message}`
    });
  });
  
  // 添加失败任务
  results.failed.forEach(item => {
    const message = item.uid 
      ? `${item.uname}(${item.uid}): ${item.message}`
      : item;
    
    notifyData.tasks.push({
      name: '漫画签到',
      status: 'failed',
      message
    });
  });
  
  // 添加跳过任务
  results.skipped.forEach(item => {
    notifyData.tasks.push({
      name: '漫画签到',
      status: 'skip',
      message: item
    });
  });
  
  // 生成HTML内容
  notifyContent = Notify.getHtmlContent(notifyData);
  
  // 发送通知
  await notify.send(title, notifyContent, { isError });
}

// 立即执行任务
runTask().catch(error => {
  console.error(`任务执行出错: ${error}`);
});

module.exports = runTask; 