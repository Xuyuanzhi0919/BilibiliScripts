/**
 * 哔哩哔哩自动任务脚本配置文件
 */

// 基础配置
const config = {
  // 任务相关配置
  tasks: {
    // 是否执行每日观看视频任务
    watch: true,
    // 是否执行每日分享视频任务
    share: true,
    // 每日投币数量 [0-5]，0表示不投币
    coinsNum: 5,
    // 投币时是否同时点赞 [true/false]
    coinAddLike: true,
    // 投币策略 [1: 随机视频, 2: 关注用户视频]
    coinStrategy: 1,
    // 自定义投币用户UID，多个用逗号分隔，coinStrategy=2时有效
    coinTargetUids: '',
    // 是否执行直播签到
    liveCheck: true,
    // 是否执行漫画签到
    mangaCheck: true,
    // 大会员是否领取每日福利
    vipCheck: true
  },

  // 模拟真实行为相关配置
  behavior: {
    // 任务执行之间的随机延迟 [单位: 秒]
    delay: {
      min: 2,
      max: 8
    },
    // 是否启用随机UA
    randomUA: true,
    // 是否使用真实用户的浏览习惯 (包括停留时间等)
    realBehavior: true
  },

  // 通知相关配置
  notification: {
    // 是否启用消息推送 [true/false]
    enable: true,
    // 执行失败时是否推送 [true/false]
    onlyError: false,
    // 消息推送类型 [pushplus, serverchan, telegram, wecom, pushme]
    type: 'pushplus',
    // 各推送方式的配置参数
    pushplus: {
      token: ''
    },
    serverchan: {
      sendkey: ''
    },
    telegram: {
      botToken: '',
      chatId: ''
    },
    wecom: {
      agentId: '',
      corpId: '',
      corpSecret: '',
      toUser: '@all'
    },
    pushme: {
      key: ''
    }
  },
  
  // 调试相关配置
  debug: {
    // 是否输出详细日志 [true/false]
    verbose: false,
    // 是否保存请求和响应日志 [true/false]
    saveRequestLog: false
  }
};

// 用户代理列表
const USER_AGENTS = [
  // 安卓端UA
  'Mozilla/5.0 (Android 12; Mobile; rv:109.0) Gecko/113.0 Firefox/113.0',
  'Mozilla/5.0 (Linux; Android 10; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 10; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36 EdgA/112.0.1722.59',
  'bilibili/7.13.0 (7130300) Android/13 Phone/OnePlus BE2028',
  'bilibili/7.14.0 (7140100) Android/12 Phone/Xiaomi 2201123C',
  'bilibili/7.12.1 (7120100) Android/11 Phone/OPPO PDSM00',
  
  // iOS端UA
  'bilibili/7.14.0 (7140100) iOS/16.5 os/ios model/iPhone 14 Pro Max mobi_app/iphone build/7140100 osVer/16.5 network/2 channel/AppStore',
  'bilibili/7.13.0 (7130300) iOS/16.3.1 os/ios model/iPhone 13 mobi_app/iphone build/7130300 osVer/16.3.1 network/1 channel/AppStore',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
  
  // 桌面端UA
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.57',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
];

// APP版本信息
const APP_VERSION = {
  android: {
    version: '7.14.0',
    buildCode: '7140100'
  },
  ios: {
    version: '7.14.0',
    buildCode: '7140100'
  }
};

// 哔哩哔哩API接口
const BILIBILI_API = {
  // 登录相关
  login: {
    // 用户信息
    userInfo: 'https://api.bilibili.com/x/web-interface/nav',
    // 每日奖励信息
    reward: 'https://api.bilibili.com/x/member/web/exp/reward'
  },
  // 视频相关
  video: {
    // 分区视频
    zoneVideos: 'https://api.bilibili.com/x/web-interface/dynamic/region',
    // 推荐视频
    recommend: 'https://api.bilibili.com/x/web-interface/index/top/rcmd',
    // 视频详情
    view: 'https://api.bilibili.com/x/web-interface/view',
    // 视频心跳
    heartbeat: 'https://api.bilibili.com/x/click-interface/web/heartbeat',
    // 分享视频
    share: 'https://api.bilibili.com/x/web-interface/share/add',
    // 投币
    coin: 'https://api.bilibili.com/x/web-interface/coin/add',
    // 点赞
    like: 'https://api.bilibili.com/x/web-interface/archive/like'
  },
  // 直播相关
  live: {
    // 签到
    sign: 'https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign',
    // 直播间列表
    liveList: 'https://api.live.bilibili.com/xlive/web-interface/v1/second/getList'
  },
  // 漫画相关
  manga: {
    // 签到
    sign: 'https://manga.bilibili.com/twirp/activity.v1.Activity/ClockIn'
  },
  // VIP相关
  vip: {
    // 大会员福利
    privilege: 'https://api.bilibili.com/x/vip/privilege/receive',
    // 大会员状态
    status: 'https://api.bilibili.com/x/vip/web/user/info'
  }
};

module.exports = {
  config,
  USER_AGENTS,
  APP_VERSION,
  BILIBILI_API
}; 