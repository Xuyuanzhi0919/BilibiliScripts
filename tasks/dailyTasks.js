/**
 * 哔哩哔哩每日任务
 * 包含观看视频、投币、分享视频等任务
 */

const Request = require('../utils/request');
const { BILIBILI_API, config } = require('../utils/config');
const { 
  sleep, 
  getBiliCookies, 
  extractCSRF, 
  formatDate, 
  randomInt 
} = require('../utils/common');
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
 * 获取每日任务奖励信息
 * @param {Request} request - 请求对象
 */
async function getDailyRewardInfo(request) {
  try {
    const response = await request.get(BILIBILI_API.login.reward);
    if (response.code === 0 && response.data) {
      return {
        login: response.data.login,
        watch: response.data.watch,
        coins: response.data.coins,
        share: response.data.share,
        level: response.data.level_info.current_level,
        exp: {
          current: response.data.level_info.current_exp,
          next: response.data.level_info.next_exp
        }
      };
    } else {
      throw new Error(`获取任务奖励信息失败: ${response.message}`);
    }
  } catch (error) {
    console.error(`获取任务奖励信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取推荐视频
 * @param {Request} request - 请求对象
 * @param {number} ps - 获取数量
 */
async function getRecommendVideos(request, ps = 20) {
  try {
    const response = await request.get(BILIBILI_API.video.recommend, {
      fresh_type: 3,
      version: 1,
      ps
    }, {
      headers: {
        'Referer': 'https://www.bilibili.com/'
      }
    });
    
    if (response.code === 0 && response.data && response.data.item) {
      return response.data.item.map(item => ({
        bvid: item.bvid,
        aid: item.id,
        title: item.title,
        author: item.owner?.name || '未知',
        mid: item.owner?.mid,
        duration: item.duration
      }));
    } else {
      throw new Error(`获取推荐视频失败: ${response.message || '未知错误'}`);
    }
  } catch (error) {
    console.error(`获取推荐视频失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取视频详情
 * @param {Request} request - 请求对象
 * @param {string} bvid - BV号
 */
async function getVideoDetail(request, bvid) {
  try {
    const response = await request.get(BILIBILI_API.video.view, {
      bvid
    });
    
    if (response.code === 0 && response.data) {
      return {
        bvid,
        aid: response.data.aid,
        title: response.data.title,
        author: response.data.owner.name,
        mid: response.data.owner.mid,
        cid: response.data.cid,
        duration: response.data.duration
      };
    } else {
      throw new Error(`获取视频详情失败: ${response.message || '未知错误'}`);
    }
  } catch (error) {
    console.error(`获取视频详情失败: ${error.message}`);
    throw error;
  }
}

/**
 * 观看视频
 * @param {Request} request - 请求对象
 * @param {Object} videoInfo - 视频信息
 */
async function watchVideo(request, videoInfo) {
  try {
    // 模拟观看视频的时长，随机30秒到2分钟
    const playedTime = randomInt(30, 120);
    
    // 模拟完整观看进度
    const progress = Math.min(Math.floor(playedTime / videoInfo.duration * 100), 90);
    
    // 发送心跳包
    const heartbeatData = {
      bvid: videoInfo.bvid,
      played_time: playedTime,
      realtime: playedTime,
      real_played_time: playedTime,
      type: 3,
      dt: 2,
      play_type: 0,
      from_spmid: '333.1007',
      auto_continued_play: 0,
      refer_url: 'https://www.bilibili.com',
      spmid: '333.788'
    };
    
    const response = await request.post(BILIBILI_API.video.heartbeat, heartbeatData, {
      headers: {
        'Referer': `https://www.bilibili.com/video/${videoInfo.bvid}`
      }
    });
    
    if (response.code === 0) {
      return {
        status: true,
        message: `观看视频 ${cutString(videoInfo.title, 20)} 成功`,
        progress: `${progress}%`
      };
    } else {
      return {
        status: false,
        message: `观看视频失败: ${response.message || '未知错误'}`
      };
    }
  } catch (error) {
    console.error(`观看视频请求失败: ${error.message}`);
    return {
      status: false,
      message: `观看视频失败: ${error.message}`
    };
  }
}

/**
 * 分享视频
 * @param {Request} request - 请求对象
 * @param {Object} videoInfo - 视频信息
 * @param {string} csrf - CSRF令牌
 */
async function shareVideo(request, videoInfo, csrf) {
  try {
    const response = await request.post(BILIBILI_API.video.share, {
      bvid: videoInfo.bvid,
      csrf
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `https://www.bilibili.com/video/${videoInfo.bvid}`
      }
    });
    
    if (response.code === 0) {
      return {
        status: true,
        message: `分享视频 ${cutString(videoInfo.title, 20)} 成功`
      };
    } else if (response.code === 71000) {
      return {
        status: true,
        message: '今日已完成分享任务'
      };
    } else {
      return {
        status: false,
        message: `分享视频失败: ${response.message || '未知错误'}`
      };
    }
  } catch (error) {
    console.error(`分享视频请求失败: ${error.message}`);
    return {
      status: false,
      message: `分享视频失败: ${error.message}`
    };
  }
}

/**
 * 投币
 * @param {Request} request - 请求对象
 * @param {Object} videoInfo - 视频信息
 * @param {string} csrf - CSRF令牌
 * @param {number} coinNum - 投币数量
 * @param {boolean} like - 是否同时点赞
 */
async function coinVideo(request, videoInfo, csrf, coinNum = 1, like = true) {
  try {
    const response = await request.post(BILIBILI_API.video.coin, {
      aid: videoInfo.aid,
      bvid: videoInfo.bvid,
      multiply: coinNum,
      select_like: like ? 1 : 0,
      cross_domain: true,
      csrf
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `https://www.bilibili.com/video/${videoInfo.bvid}`
      }
    });
    
    if (response.code === 0) {
      return {
        status: true,
        message: `为 ${cutString(videoInfo.title, 20)} 投币${coinNum}个 ${like ? '并点赞' : ''} 成功`
      };
    } else if (response.code === -104) {
      return {
        status: false,
        message: '硬币余额不足'
      };
    } else if (response.code === 34005) {
      return {
        status: true,
        message: `已经为 ${cutString(videoInfo.title, 20)} 投过币了`
      };
    } else {
      return {
        status: false,
        message: `投币失败: ${response.message || '未知错误'}`
      };
    }
  } catch (error) {
    console.error(`投币请求失败: ${error.message}`);
    return {
      status: false,
      message: `投币失败: ${error.message}`
    };
  }
}

/**
 * 点赞视频
 * @param {Request} request - 请求对象
 * @param {Object} videoInfo - 视频信息
 * @param {string} csrf - CSRF令牌
 */
async function likeVideo(request, videoInfo, csrf) {
  try {
    const response = await request.post(BILIBILI_API.video.like, {
      aid: videoInfo.aid,
      bvid: videoInfo.bvid,
      like: 1,
      csrf
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `https://www.bilibili.com/video/${videoInfo.bvid}`
      }
    });
    
    if (response.code === 0) {
      return {
        status: true,
        message: `点赞视频 ${cutString(videoInfo.title, 20)} 成功`
      };
    } else {
      return {
        status: false,
        message: `点赞视频失败: ${response.message || '未知错误'}`
      };
    }
  } catch (error) {
    console.error(`点赞视频请求失败: ${error.message}`);
    return {
      status: false,
      message: `点赞视频失败: ${error.message}`
    };
  }
}

/**
 * 截取字符串
 * @param {string} str - 字符串
 * @param {number} len - 长度
 * @returns {string} - 截取后的字符串
 */
function cutString(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

/**
 * 获取随机视频
 * @param {Array} videoList - 视频列表
 * @param {number} count - 数量
 */
function getRandomVideos(videoList, count = 1) {
  if (!videoList || videoList.length === 0) return [];
  const shuffled = [...videoList].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * 执行每日任务
 * @param {Request} request - 请求对象
 * @param {string} csrf - CSRF令牌
 * @param {Object} userInfo - 用户信息
 */
async function runDailyTasks(request, csrf, userInfo) {
  // 获取每日任务奖励信息
  const rewardInfo = await getDailyRewardInfo(request);
  console.log('=== 任务状态 ===');
  console.log(`登录: ${rewardInfo.login ? '✓' : '✗'}`);
  console.log(`观看: ${rewardInfo.watch ? '✓' : '✗'}`);
  console.log(`投币: ${rewardInfo.coins}/5`);
  console.log(`分享: ${rewardInfo.share ? '✓' : '✗'}`);
  console.log(`等级: ${rewardInfo.level} (${rewardInfo.exp.current}/${rewardInfo.exp.next})`);
  
  // 存储任务结果
  const taskResults = [];
  
  // 获取推荐视频
  const recommendVideos = await getRecommendVideos(request, 30);
  console.log(`获取到 ${recommendVideos.length} 个推荐视频`);
  
  // 随机选择视频
  const videos = getRandomVideos(recommendVideos, 5);
  
  // 1. 观看视频任务
  if (!rewardInfo.watch && config.tasks.watch) {
    console.log('\n=== 执行观看视频任务 ===');
    try {
      // 获取视频详情
      const videoInfo = await getVideoDetail(request, videos[0].bvid);
      console.log(`开始观看视频: ${videoInfo.title}`);
      
      // 随机延迟
      await sleep(2, 5);
      
      // 执行观看视频
      const watchResult = await watchVideo(request, videoInfo);
      
      if (watchResult.status) {
        console.log(`✓ ${watchResult.message}`);
        if (watchResult.progress) {
          console.log(`  观看进度: ${watchResult.progress}`);
        }
        taskResults.push({
          name: '观看视频',
          status: 'success',
          message: watchResult.message
        });
      } else {
        console.log(`✗ ${watchResult.message}`);
        taskResults.push({
          name: '观看视频',
          status: 'failed',
          message: watchResult.message
        });
      }
    } catch (error) {
      console.error(`观看视频任务失败: ${error.message}`);
      taskResults.push({
        name: '观看视频',
        status: 'failed',
        message: `执行失败: ${error.message}`
      });
    }
  } else if (rewardInfo.watch) {
    console.log('观看视频任务已完成，跳过');
    taskResults.push({
      name: '观看视频',
      status: 'skip',
      message: '任务已完成，跳过'
    });
  } else if (!config.tasks.watch) {
    console.log('观看视频任务已关闭，跳过');
    taskResults.push({
      name: '观看视频',
      status: 'skip',
      message: '任务已关闭，跳过'
    });
  }
  
  // 随机延迟
  await sleep(5, 10);
  
  // 2. 分享视频任务
  if (!rewardInfo.share && config.tasks.share) {
    console.log('\n=== 执行分享视频任务 ===');
    try {
      // 获取视频详情
      const videoInfo = await getVideoDetail(request, videos[1].bvid);
      console.log(`开始分享视频: ${videoInfo.title}`);
      
      // 随机延迟
      await sleep(2, 5);
      
      // 执行分享视频
      const shareResult = await shareVideo(request, videoInfo, csrf);
      
      if (shareResult.status) {
        console.log(`✓ ${shareResult.message}`);
        taskResults.push({
          name: '分享视频',
          status: 'success',
          message: shareResult.message
        });
      } else {
        console.log(`✗ ${shareResult.message}`);
        taskResults.push({
          name: '分享视频',
          status: 'failed',
          message: shareResult.message
        });
      }
    } catch (error) {
      console.error(`分享视频任务失败: ${error.message}`);
      taskResults.push({
        name: '分享视频',
        status: 'failed',
        message: `执行失败: ${error.message}`
      });
    }
  } else if (rewardInfo.share) {
    console.log('分享视频任务已完成，跳过');
    taskResults.push({
      name: '分享视频',
      status: 'skip',
      message: '任务已完成，跳过'
    });
  } else if (!config.tasks.share) {
    console.log('分享视频任务已关闭，跳过');
    taskResults.push({
      name: '分享视频',
      status: 'skip',
      message: '任务已关闭，跳过'
    });
  }
  
  // 随机延迟
  await sleep(5, 10);
  
  // 3. 投币任务
  if (rewardInfo.coins < 5 && config.tasks.coinsNum > 0) {
    console.log('\n=== 执行投币任务 ===');
    
    // 计算需要投币的数量
    const needCoins = Math.min(config.tasks.coinsNum - rewardInfo.coins, 5 - rewardInfo.coins);
    
    if (needCoins <= 0) {
      console.log('投币任务已完成，跳过');
      taskResults.push({
        name: '投币任务',
        status: 'skip',
        message: '任务已完成，跳过'
      });
    } else {
      console.log(`需要投币数量: ${needCoins}`);
      
      // 检查用户硬币余额
      if (userInfo.coins < needCoins) {
        console.log(`硬币余额不足，当前余额: ${userInfo.coins}，需要: ${needCoins}`);
        taskResults.push({
          name: '投币任务',
          status: 'failed',
          message: `硬币余额不足，当前余额: ${userInfo.coins}，需要: ${needCoins}`
        });
      } else {
        // 遍历视频进行投币
        let coinCount = 0;
        for (let i = 0; i < videos.length && coinCount < needCoins; i++) {
          // 获取视频详情
          const videoInfo = await getVideoDetail(request, videos[i].bvid);
          console.log(`开始为视频投币: ${videoInfo.title}`);
          
          // 随机延迟
          await sleep(2, 5);
          
          // 执行投币
          const coinResult = await coinVideo(request, videoInfo, csrf, 1, config.tasks.coinAddLike);
          
          if (coinResult.status) {
            console.log(`✓ ${coinResult.message}`);
            coinCount++;
            taskResults.push({
              name: '投币任务',
              status: 'success',
              message: coinResult.message
            });
          } else {
            console.log(`✗ ${coinResult.message}`);
            if (coinResult.message.includes('硬币余额不足')) {
              break;
            }
          }
          
          // 随机延迟
          await sleep(5, 10);
        }
        
        if (coinCount === 0) {
          taskResults.push({
            name: '投币任务',
            status: 'failed',
            message: '投币失败，可能没有找到适合的视频'
          });
        } else if (coinCount < needCoins) {
          taskResults.push({
            name: '投币任务',
            status: 'success',
            message: `部分完成，实际投币: ${coinCount}/${needCoins}`
          });
        }
      }
    }
  } else if (rewardInfo.coins >= 5) {
    console.log('投币任务已完成，跳过');
    taskResults.push({
      name: '投币任务',
      status: 'skip',
      message: '任务已完成，跳过'
    });
  } else if (config.tasks.coinsNum <= 0) {
    console.log('投币任务已关闭，跳过');
    taskResults.push({
      name: '投币任务',
      status: 'skip',
      message: '任务已关闭，跳过'
    });
  }
  
  // 返回任务结果
  return taskResults;
}

/**
 * 执行任务
 */
async function runTask() {
  console.log(`\n=================== 哔哩哔哩每日任务 - ${formatDate()} ===================`);
  
  // 获取Cookie
  const cookies = getBiliCookies();
  
  if (cookies.length === 0) {
    const message = '未配置 BILIBILI_COOKIE 环境变量，请先配置';
    console.log(message);
    await notify.send('哔哩哔哩每日任务失败', message, { isError: true });
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
      
      // 随机延迟
      await sleep(2, 5);
      
      // 执行每日任务
      const taskResults = await runDailyTasks(request, csrf, userInfo);
      
      // 保存结果
      results.success.push({
        uid: userInfo.uid,
        uname: userInfo.uname,
        tasks: taskResults
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
  console.log(`✓ 成功账号数: ${results.success.length}`);
  console.log(`✗ 失败账号数: ${results.failed.length}`);
  console.log(`⏭ 跳过账号数: ${results.skipped.length}`);
  
  // 发送通知
  const title = '哔哩哔哩每日任务';
  
  // 构建通知内容
  let notifyContent = '';
  let isError = results.failed.length > 0;
  
  // 格式化HTML内容
  const notifyData = {
    tasks: [],
    stats: {
      '总账号数': cookies.length,
      '成功账号数': results.success.length,
      '失败账号数': results.failed.length,
      '跳过账号数': results.skipped.length
    },
    executionTime: formatDate()
  };
  
  // 添加成功账号任务
  results.success.forEach(item => {
    // 先添加用户标头
    notifyData.tasks.push({
      name: `账号:${item.uname}`,
      status: 'success',
      message: `UID:${item.uid}`
    });
    
    // 添加该用户的各个任务
    if (item.tasks && item.tasks.length) {
      item.tasks.forEach(task => {
        notifyData.tasks.push({
          name: `└─${task.name}`,
          status: task.status,
          message: task.message
        });
      });
    }
  });
  
  // 添加失败账号
  results.failed.forEach(item => {
    notifyData.tasks.push({
      name: '账号执行失败',
      status: 'failed',
      message: item
    });
  });
  
  // 添加跳过账号
  results.skipped.forEach(item => {
    notifyData.tasks.push({
      name: '账号跳过',
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