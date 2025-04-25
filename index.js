/**
 * 哔哩哔哩脚本 - 主入口文件
 * 可以同时执行所有任务
 */

const { formatDate, formatDuration } = require('./utils/common');
const Notify = require('./utils/notify');
const { config } = require('./utils/config');

// 任务列表
const tasks = {
  dailyTasks: {
    module: require('./tasks/dailyTasks'),
    name: '每日任务',
    enabled: true
  },
  liveSign: {
    module: require('./tasks/liveSign'),
    name: '直播签到',
    enabled: config.tasks.liveCheck
  },
  mangaSign: {
    module: require('./tasks/mangaSign'),
    name: '漫画签到',
    enabled: config.tasks.mangaCheck
  },
  vipTask: {
    module: require('./tasks/vipTask'),
    name: '大会员福利',
    enabled: config.tasks.vipCheck
  }
};

/**
 * 睡眠函数
 * @param {number} ms - 毫秒数
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 执行所有任务
 */
async function runAllTasks() {
  console.log(`\n============= 哔哩哔哩多合一脚本开始运行 - ${formatDate()} =============\n`);
  
  const startTime = Date.now();
  const results = [];
  
  // 遍历执行任务
  for (const [taskId, task] of Object.entries(tasks)) {
    if (!task.enabled) {
      console.log(`[${task.name}] 任务已关闭，跳过`);
      results.push({
        name: task.name,
        status: 'skip',
        message: '任务已关闭'
      });
      continue;
    }
    
    try {
      console.log(`\n[${task.name}] 任务开始执行...`);
      
      // 执行任务
      const taskStartTime = Date.now();
      await task.module();
      const taskEndTime = Date.now();
      
      const duration = formatDuration(taskEndTime - taskStartTime);
      console.log(`[${task.name}] 任务执行完成，耗时: ${duration}`);
      
      results.push({
        name: task.name,
        status: 'success',
        message: `执行完成，耗时: ${duration}`
      });
      
      // 任务间隔
      await sleep(3000);
    } catch (error) {
      console.error(`[${task.name}] 任务执行出错: ${error.message}`);
      results.push({
        name: task.name,
        status: 'failed',
        message: `执行出错: ${error.message}`
      });
    }
  }
  
  const endTime = Date.now();
  const totalDuration = formatDuration(endTime - startTime);
  
  console.log(`\n============= 哔哩哔哩多合一脚本执行完毕 - 总耗时: ${totalDuration} =============\n`);
  
  // 发送通知
  if (config.notification.enable) {
    try {
      const notify = new Notify();
      const title = '哔哩哔哩多合一脚本执行结果';
      
      // 构建通知内容
      const notifyData = {
        tasks: results,
        stats: {
          '总任务数': Object.keys(tasks).length,
          '成功任务数': results.filter(r => r.status === 'success').length,
          '失败任务数': results.filter(r => r.status === 'failed').length,
          '跳过任务数': results.filter(r => r.status === 'skip').length,
          '总耗时': totalDuration
        },
        executionTime: formatDate()
      };
      
      // 生成HTML内容
      const notifyContent = Notify.getHtmlContent(notifyData);
      
      // 发送通知
      const isError = results.some(r => r.status === 'failed');
      await notify.send(title, notifyContent, { isError });
    } catch (error) {
      console.error(`发送通知失败: ${error.message}`);
    }
  }
}

// 执行所有任务
runAllTasks().catch(error => {
  console.error(`脚本运行出错: ${error}`);
});

module.exports = runAllTasks; 