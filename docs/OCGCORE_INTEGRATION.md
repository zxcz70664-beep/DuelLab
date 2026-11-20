# DuelLab OCGCore 接入方案（技术决策稿）

更新：2026-11-20

## 1. 决策摘要

DuelLab 后续规则裁定采用 **Project Ignis / EDOPro 分支的 ocgcore，通过 `ocgcore-wasm` 在浏览器运行**。不继续扩张当前 `app.js` 中的自制规则代码。

首选技术验证对象：
- WASM 包：`@n1xx1/ocgcore-wasm`（JSR 包名；GitHub 项目 n1xx1/ocgcore-wasm）。
- 核心来源：Project Ignis 的 EDOPro ocgcore fork。
- 卡牌数据库：ProjectIgnis/BabelCDB。
- 卡牌脚本：ProjectIgnis/CardScripts，必须与所选 ocgcore 版本匹配。
- 运行方式：浏览器 WASM，先在本地静态网页内启动核心，不把每次对局请求发往服务器。

## 2. 为什么选择这个实现

该 WASM 项目的公开说明明确提供浏览器、Node.js、Deno 使用目标，并给出 `createCore({ sync: true })`、`createDuel`、`startDuel`、`duelProcess`、`duelGetMessage`、`duelSetResponse` 的工作流。创建决斗时由调用方提供 `cardReader` 和 `scriptReader`，所以它不是“只装一个 wasm 文件就能运行”：必须同时提供匹配的卡牌数据与 Lua 脚本。

选择 EDOPro fork 而不是任意旧版 YGOPro core，是因为 Project Ignis 明确说明其客户端累积改动后与非该分支衍生的模拟器不兼容。数据库、脚本和核心要作为一个版本组合管理。

## 3. 当前数据与核心的差距

DuelLab 当前 `cards.json` 是从 BabelCDB CDB 转出的浏览器搜索数据，主要字段包括 ID、类型、攻守、等级、名称和效果文本。它**不是**核心运行时所需的完整运行环境：
- 尚未随站点提供 Lua 卡牌脚本；
- 尚未验证 CDB 与 WASM 核心的 API/版本兼容性；
- 当前导入器保留上游原始文本，不保证简体中文或日文；
- 当前卡组检查没有 OCG 禁限卡表验证；
- 现有简化决斗代码没有规则兼容性，不能直接作为 OCGCore 的裁定层。

因此，第一步不应把当前简化决斗按钮改名为“真实决斗”，而应新增独立的核心适配层，完成最小对局验证后再切换 UI。

## 4. 分阶段实施

### 阶段 A：核心加载验证（下一开发任务）
1. 锁定 WASM 包的确切版本与完整许可证文本。
2. 将核心加载器封装为独立模块，不改动现有简化模式。
3. 在 CI 中验证浏览器模块可加载、WASM 可初始化。
4. 建立最小测试卡池与测试脚本目录，验证创建 Duel、发起对局、读取消息、提交响应、结束并释放 Duel。
5. 记录核心版本、构建来源、脚本 commit、数据库 commit。

验收：浏览器能加载核心并创建/销毁一个测试 Duel；缺少脚本或卡牌时给出明确错误，不静默回退到简化规则。

### 阶段 B：卡牌数据与脚本供应
1. 固定 BabelCDB 与 CardScripts 的同一兼容快照。
2. 将 CDB 转换为核心所需的完整 OCG card data 结构，不能只传当前 UI 简化字段。
3. 按脚本路径规则加载 Lua；脚本缺失时标记该卡不可用于核心对局。
4. 生成卡牌数据与脚本的覆盖率报告。

验收：抽样普通怪兽、魔法、陷阱、融合、同调、超量、灵摆、连接卡均能被核心识别；覆盖率和失败清单可复现。

### 阶段 C：决斗 UI 适配
1. 把核心消息转换成 UI 事件：抽卡、洗切、召唤/特殊召唤、连锁、战斗、伤害、区域移动、胜负。
2. 把玩家点击转换成核心要求的响应，不在前端自行判定是否合法。
3. 核心消息未知或 UI 不支持时阻止继续并显示诊断信息。
4. 保留旧简化模式作为明确标注的 Sandbox，不与 OCG 模式混用。

验收：以固定测试卡组完成一组可重复的标准流程，并核对关键状态与核心消息一致。

### 阶段 D：单人 AI
OCGCore 负责规则裁定，不等于自动提供强 AI。AI 需要单独决策层，读取核心给出的合法操作候选，再按策略选择响应。第一版采用规则优先级策略，不允许 AI 读取玩家隐藏手牌或牌库顺序。

## 5. 许可与分发注意

- `ocgcore-wasm` 项目页面标注 MIT；仍需将实际选定版本中的 LICENSE 文件随发布包核对。
- EDOPro / Project Ignis 相关组件及脚本可能采用 AGPL-3.0 或其他各自许可证；不能因为 WASM 包是 MIT 就推断整套组合均为 MIT。
- BabelCDB、CardScripts、核心、图片资源分别记录来源与许可证；在确定部署/分发方式前完成逐项核查。
- DuelLab 是私人项目，但若向公众部署或分发，必须重新评估 AGPL 对修改版核心及网络使用场景的义务。
- Yu-Gi-Oh! 卡牌名称、文本、图像及商标权利不因开源核心而转移。DuelLab 不宣称获得 Konami 授权。

## 6. 关键风险与阻断条件

| 风险 | 处理 |
|---|---|
| WASM 与 EDOPro core 版本漂移 | 固定版本，不追随 latest 自动升级 |
| CDB 与 Lua 脚本不匹配 | 数据库与脚本按同一上游快照锁定 |
| 浏览器无法直接读取脚本路径 | 提供受控脚本资源映射层；处理 MIME、缓存和路径 |
| 核心要求的卡牌数据结构与现有 JSON 不同 | 写明确转换器并做字段测试，禁止猜字段 |
| 缺失脚本导致效果不完整 | 阻止该卡进入 OCG 模式，不用空脚本冒充支持 |
| AI 误用隐藏信息 | 只向策略层提供合法公开状态与自身私有信息 |

## 7. 当前状态

- 已有：浏览器静态工作台、BabelCDB 搜索快照、卡组本地保存。
- 未有：WASM 核心文件、Lua 脚本运行目录、核心适配器、真实 OCG 对局、AI 决策。
- 当前简化对局：仅为 UI/流程试验，不是 OCG 规则实现。
- 下一项实际开发：阶段 A 的独立核心加载 Spike；完成前不删除现有简化模式，也不切换线上版本。

## 8. 参考资料

- WASM 项目与示例：https://github.com/n1xx1/ocgcore-wasm
- JSR 包说明与版本：https://jsr.io/@n1xx1/ocgcore-wasm
- Project Ignis 组织（BabelCDB、CardScripts）：https://github.com/ProjectIgnis
- EDOPro 说明及核心兼容性声明：https://github.com/edo9300/edopro
