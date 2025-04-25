/**
 * 哔哩哔哩大会员福利任务
 * 实现B站大会员每月福利领取
 */

const Request = require('../utils/request');
const { BILIBILI_API, config } = require('../utils/config');
const { sleep, getBiliCookies, extractCSRF, formatDate } = require('../utils/common');
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
      const { uname, mid: uid, level_info, money, vip } = response.data;
      return {
        uname,
        uid,
        level: level_info.current_level,
        coins: money,
        vip: {
          type: vip.type, // 0:无 1:月度 2:年度大会员
          status: vip.status, // 0:无 1:有
          dueDate: vip.due_date
        }
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
 * 获取大会员权益状态
 * @param {Request} request - 请求对象
 */
async function getVipPrivilegeStatus(request) {
  try {
    const response = await request.get(BILIBILI_API.vip.status);
    if (response.code === 0 && response.data) {
      return {
        isVip: response.data.vip.status === 1,
        vipType: response.data.vip.type, // 1: 月度大会员, 2: 年度大会员
        vipStatus: response.data.vip.status, // 0: 无会员, 1: 有会员
        dueDate: new Date(response.data.vip.due_date),
        privileges: response.data.privileges || []
      };
    } else {
      throw new Error(`获取大会员权益状态失败: ${response.message}`);
    }
  } catch (error) {
    console.error(`获取大会员权益状态失败: ${error.message}`);
    throw error;
  }
}

/**
 * 领取大会员权益
 * @param {Request} request - 请求对象
 * @param {number} type - 权益类型
 * @param {string} csrf - CSRF令牌
 */
async function receiveVipPrivilege(request, type, csrf) {
  try {
    const response = await request.post(BILIBILI_API.vip.privilege, {
      type,
      csrf
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://account.bilibili.com/account/big/myPackage'
      }
    });
    
    if (response.code === 0) {
      return {
        status: true,
        message: `大会员权益领取成功: ${getPrivilegeName(type)}`
      };
    } else if (response.code === 69801) {
      return {
        status: true,
        message: `${getPrivilegeName(type)}权益已领取`
      };
    } else {
      return {
        status: false,
        message: `领取大会员权益失败: ${response.message || response.msg || '未知错误'}`
      };
    }
  } catch (error) {
    console.error(`领取大会员权益请求失败: ${error.message}`);
    return {
      status: false,
      message: `领取大会员权益失败: ${error.message}`
    };
  }
}

/**
 * 获取权益名称
 * @param {number} type - 权益类型
 * @returns {string} 权益名称
 */
function getPrivilegeName(type) {
  const privilegeNames = {
    1: 'B币券',
    2: '会员购优惠券',
    3: '漫画福利券',
    4: '会员购包邮券',
    5: '漫画商城优惠券',
    6: '装扮体验卡',
    7: '漫画福利券'
  };
  return privilegeNames[type] || `未知权益(${type})`;
}

/**
 * 格式化时间
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间
 */
function formatVipDueDate(timestamp) {
  if (!timestamp) return '未知';
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

/**
 * 执行任务
 */
async function runTask() {
  console.log(`\n=================== 哔哩哔哩大会员福利 - ${formatDate()} ===================`);
  
  // 是否启用该任务
  if (!config.tasks.vipCheck) {
    console.log('大会员福利任务已关闭，跳过执行');
    return;
  }
  
  // 获取Cookie
  const cookies = getBiliCookies();
  
  if (cookies.length === 0) {
    const message = '未配置 BILIBILI_COOKIE 环境变量，请先配置';
    console.log(message);
    await notify.send('哔哩哔哩大会员福利领取失败', message, { isError: true });
    return;
  }
  
  // 遍历执行每个账号
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const csrf = extractCSRF(cookie);
    
    if (!csrf) {
      console.log(`账号 ${i + 1} 未包含bili_jct，无法执行任务，跳过`);
      results.skipped.push(`账号 ${i + 1}: 缺少CSRF令牌`);
      continue;
    }
    
    const request = new Request(cookie);
    
    try {
      console.log(`\n===== 开始账号 ${i + 1} =====`);
      
      // 获取用户信息
      const userInfo = await getUserInfo(request);
      console.log(`用户名: ${userInfo.uname}, UID: ${userInfo.uid}, 等级: ${userInfo.level}, 硬币: ${userInfo.coins}`);
      
      // 检查是否是大会员
      const vipInfo = userInfo.vip;
      if (vipInfo.status !== 1) {
        console.log('该账号不是大会员，跳过领取福利');
        results.skipped.push({
          uid: userInfo.uid,
          uname: userInfo.uname,
          message: '非大会员账号，跳过领取福利'
        });
        continue;
      }
      
      console.log(`会员类型: ${vipInfo.type === 1 ? '月度大会员' : '年度大会员'}, 到期时间: ${formatVipDueDate(vipInfo.dueDate)}`);
      
      // 随机延迟
      await sleep(2, 5);
      
      // 获取权益状态
      const vipStatus = await getVipPrivilegeStatus(request);
      
      // 大会员权益类型
      const privilegeTypes = [1, 2, 3, 4, 5, 6, 7];
      
      // 存储领取结果
      const receiveResults = [];
      
      // 遍历领取权益
      for (const type of privilegeTypes) {
        console.log(`尝试领取 ${getPrivilegeName(type)}...`);
        
        // 随机延迟
        await sleep(2, 4);
        
        // 领取权益
        const receiveResult = await receiveVipPrivilege(request, type, csrf);
        
        if (receiveResult.status) {
          console.log(`✓ ${receiveResult.message}`);
        } else {
          console.log(`✗ ${receiveResult.message}`);
        }
        
        receiveResults.push({
          type,
          name: getPrivilegeName(type),
          status: receiveResult.status,
          message: receiveResult.message
        });
      }
      
      // 存储结果
      results.success.push({
        uid: userInfo.uid,
        uname: userInfo.uname,
        vipType: vipInfo.type === 1 ? '月度大会员' : '年度大会员',
        dueDate: formatVipDueDate(vipInfo.dueDate),
        privileges: receiveResults
      });
      
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
  const title = '哔哩哔哩大会员福利领取';
  
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
    // 添加账号信息
    notifyData.tasks.push({
      name: `账号: ${item.uname}`,
      status: 'success',
      message: `UID: ${item.uid} | ${item.vipType} (到期: ${item.dueDate})`
    });
    
    // 添加权益领取详情
    if (item.privileges && item.privileges.length) {
      item.privileges.forEach(privilege => {
        notifyData.tasks.push({
          name: `└─${privilege.name}`,
          status: privilege.status ? 'success' : 'failed',
          message: privilege.message
        });
      });
    }
  });
  
  // 添加失败任务
  results.failed.forEach(item => {
    notifyData.tasks.push({
      name: '账号执行失败',
      status: 'failed',
      message: item
    });
  });
  
  // 添加跳过任务
  results.skipped.forEach(item => {
    if (typeof item === 'string') {
      notifyData.tasks.push({
        name: '账号跳过',
        status: 'skip',
        message: item
      });
    } else {
      notifyData.tasks.push({
        name: `账号: ${item.uname}`,
        status: 'skip',
        message: item.message
      });
    }
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