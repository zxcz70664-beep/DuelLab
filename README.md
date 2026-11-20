# DuelLab V0.1 原型

## 运行
需要 Node.js 22 或兼容版本：`npm start`，浏览器访问 http://localhost:8080。

## Docker
`docker build -t duellab-v01 .`
`docker run --rm -p 8080:8080 duellab-v01`

## 已实现
决斗场地区域、手牌选择和详情、演示卡牌放置、占位抽卡、LP调整、阶段切换、操作日志、服务端健康检查、Docker部署入口。

## 未实现
没有接入 OCGCore；没有真实召唤裁定、连锁、效果结算、超量素材、卡组洗切、玩家隐私隔离、用户/房间、WebSocket或数据库。当前状态只在浏览器内存，刷新即重置。
