# 哔哩哔哩自动签到与每日任务脚本

适用于青龙面板的哔哩哔哩（B站）自动化脚本，支持：
- 每日签到领取硬币
- 观看视频
- 投币任务
- 分享视频
- 直播签到
- 漫画签到
- 大会员每日福利
- 模拟真实用户行为

## 功能特性

- 模拟APP/网页真实请求
- 随机延时操作
- 支持配置多账号
- 每日任务进度推送

## 使用方法

1. **环境要求**
   - Node.js (12.0.0 以上版本)
   - 青龙面板 2.10.13 或更高版本

2. **安装依赖**
   ```bash
   npm install axios crypto-js tough-cookie fs path moment
   ```

3. **配置账号**

   在青龙面板的环境变量中添加：
   - `BILIBILI_COOKIE` - B站Cookie，支持多账号，以&分隔
   - `BILIBILI_PUSH` - 消息推送方式，可选（pushplus、serverchan等）

4. **定时任务设置**
   
   建议每日执行一次，例如：
   ```
   30 8 * * * task bilibili_qinglong/tasks/dailyTasks.js
   ```

## 配置说明

详细配置及参数说明请查看 [config.js](./utils/config.js) 文件。

## 免责声明

1. 本项目仅用于学习交流，请勿用于商业用途
2. 不保证脚本的稳定性和可用性
3. 使用本脚本产生的一切后果由使用者自行承担

## 参考

- [哔哩哔哩-API收集整理](https://github.com/SocialSisterYi/bilibili-API-collect) 