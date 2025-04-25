/**
 * 哔哩哔哩直播签到脚本
 * 实现直播签到功能
 */

const Request = require('../utils/request');
const { BILIBILI_API } = require('../utils/config');
const { sleep, getBiliCookies, formatDate } = require('../utils/common');
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
 * 直播签到
 * @param {Request} request - 请求对象
 */
async function liveSign(request) {
  try {
    const response = await request.get(BILIBILI_API.live.sign, {}, {
      headers: {
        'Referer': 'https://live.bilibili.com/'
      }
    });
    
    if (response.code === 0) {
      const { text, specialText, allDays, hadSignDays, isSign } = response.data;
      return {
        status: true,
        message: isSign ? `今日已签到: ${specialText || text}` : `签到成功: ${specialText || text}`,
        details: `已签到${hadSignDays}天，本月共${allDays}天`
      };
    } else if (response.code === 1011040) {
      return {
        status: true,
        message: '今日已完成直播签到'
      };
    } else {
      return {
        status: false,
        message: `直播签到失败: ${response.message || response.msg || '未知错误'}`
      };
    }
  } catch (error) {
    console.error(`直播签到请求失败: ${error.message}`);
    return {
      status: false,
      message: `直播签到失败: ${error.message}`
    };
  }
}

/**
 * 执行任务
 */
async function runTask() {
  console.log(`\n=================== 哔哩哔哩直播签到 - ${formatDate()} ===================`);
  
  // 获取Cookie
  const cookies = getBiliCookies();
  
  if (cookies.length === 0) {
    const message = '未配置 BILIBILI_COOKIE 环境变量，请先配置';
    console.log(message);
    await notify.send('哔哩哔哩直播签到失败', message, { isError: true });
    return;
  }
  
  // 遍历执行每个账号
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const request = new Request(cookie);
    
    try {
      console.log(`\n===== 开始账号 ${i + 1} =====`);
      
      // 获取用户信息
      const userInfo = await getUserInfo(request);
      console.log(`用户名: ${userInfo.uname}, UID: ${userInfo.uid}, 等级: ${userInfo.level}, 硬币: ${userInfo.coins}`);
      
      // 随机延迟
      await sleep(2, 5);
      
      // 执行直播签到
      const signResult = await liveSign(request);
      
      if (signResult.status) {
        console.log(`✓ ${signResult.message}`);
        if (signResult.details) {
          console.log(`  ${signResult.details}`);
        }
        results.success.push({
          uid: userInfo.uid,
          uname: userInfo.uname,
          message: signResult.message,
          details: signResult.details
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
  const title = '哔哩哔哩直播签到';
  
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
    let message = `${item.uname}(${item.uid}): ${item.message}`;
    if (item.details) {
      message += ` - ${item.details}`;
    }
    
    notifyData.tasks.push({
      name: '直播签到',
      status: 'success',
      message
    });
  });
  
  // 添加失败任务
  results.failed.forEach(item => {
    const message = item.uid 
      ? `${item.uname}(${item.uid}): ${item.message}`
      : item;
    
    notifyData.tasks.push({
      name: '直播签到',
      status: 'failed',
      message
    });
  });
  
  // 添加跳过任务
  results.skipped.forEach(item => {
    notifyData.tasks.push({
      name: '直播签到',
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