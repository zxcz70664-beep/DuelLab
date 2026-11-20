# OCGCore 数据与脚本接入锁定记录

更新：2026-11-20

## 目的

为第一场含卡牌的 OCGCore 决斗准备可复现的数据输入。此文件是阶段 B 的接入规范，不表示资源已经下载、运行或验证通过。

## 已确认的上游要求

Project Ignis 的卡牌定义至少由以下部分组成：

1. CDB 数据库：卡片密码、类型、属性、种族、等级、攻守、字段/系列等运行数据。
2. Lua 脚本：实现卡片行为。非灵摆通常怪兽可没有独立卡片脚本；其他卡片必须按对应规则提供脚本。
3. 可选卡图：仅用于显示，不参与规则裁定。

卡片密码必须在数据库、脚本文件名和卡图资源之间一致。脚本采用 Lua 5.3，目标是 EDOPro 内嵌的 OCGCore Lua 环境。

参考：
- https://projectignis.github.io/scrapi-book/getting-started/setup.html
- https://github.com/ProjectIgnis/CardScripts
- https://github.com/ProjectIgnis/BabelCDB

## 版本锁定候选（尚未通过兼容性验证）

| 组件 | 候选版本/快照 | 状态 |
|---|---|---|
| WASM wrapper | JSR @n1xx1/ocgcore-wasm 0.1.6 | 浏览器初始化、版本读取、空 Duel 创建/释放已由用户验证 |
| BabelCDB | 先前调研记录 HEAD `7be9fd135c073d8b9086925853e3cd1cc4ad55ea` | 待核对该快照的构建产物及 core 兼容关系 |
| CardScripts | 先前调研记录 HEAD `c6ae1aa29f10f678496064a5e8525ade40286d03` | 待核对该快照的构建产物及 core 兼容关系 |

**禁止把“各自仓库 HEAD”自动视为兼容组合。** 正式锁定前必须核对 ocgcore-wasm 所捆绑的 EDOPro core 来源/commit，以及 BabelCDB、CardScripts 对应的 Project Ignis 发布快照。若无法证明兼容，先以同一 EDOPro 发布/更新快照为准，不混用任意最新版本。

## DuelLab 现有数据的边界

`public/cards.json` 是给浏览器卡片搜索与卡组编辑使用的展示目录，不是核心 CDB 的完整替代品。不能直接把其字段对象作为 OCGCore 的 `cardReader` 返回值。

现有导入器使用 BabelCDB 的 `cards.cdb`，但构建后只输出简化 JSON。下一步需新增独立的 runtime 数据导出，不改变现有搜索目录。

## 阶段 B 实施顺序

### B1. 固定源并保留来源信息
- 以不可变 commit SHA 获取 CDB 与 CardScripts，不使用 master/main 的浮动 URL。
- 保存 SHA-256、上游 URL、commit SHA、获取时间、许可证文件路径。
- 不把上游数据仓库整个 HEAD 的日期相近当作兼容性证据。

### B2. 构建核心卡片读取器
- 以所选 wrapper 的 TypeScript 类型定义为唯一字段结构依据。
- 从 CDB 的 `datas` 表映射核心运行字段；从 `texts` 表读取名称与文本（仅用于显示/必要元数据）。
- 对每个字段记录来源、SQLite 类型、转换规则和缺失值策略。
- 对未知位标志、超出安全整数范围的值、缺失记录采取显式报错，不静默猜测。
- 按卡片密码索引；重复 ID 必须报错。

### B3. 构建 Lua 脚本资源读取器
- 保留公共根脚本（常量、工具、召唤程序等）与卡片脚本目录结构。
- 先按 wrapper 实际 scriptReader 请求路径建立映射，再接入 HTTP 资源读取。
- 不使用空脚本替代缺失脚本。
- 对非灵摆通常怪兽按官方约定允许无独立脚本；其他卡片缺脚本时阻止加入 OCG 测试卡组。

### B4. 最小测试卡组
第一轮只挑选 2–4 张确认存在于固定 CDB 快照的非灵摆通常怪兽。此类卡可用于验证卡片读取、发牌、抽卡、通常召唤、攻击和伤害，不需要伪造卡片效果脚本。

随后再增加一张有脚本的效果怪兽，验证 Lua 环境和脚本读取。魔法、陷阱、额外卡组及复杂效果放到后续批次。

### B5. 验收标准
- 记录核心版本、CDB SHA、CardScripts SHA 和资源哈希。
- 对选定测试卡，核对 CDB 完整字段与 cardReader 输出。
- 测试缺失卡片、缺失脚本、脚本加载失败的错误路径。
- 浏览器内创建 Duel、加入双方卡组、startDuel、处理消息并提交至少一个合法响应。
- 最终由核心消息确认抽卡、召唤、攻击/伤害和回合推进；UI 显示不能作为规则验证的唯一证据。

## 许可证与分发阻断项

CardScripts 仓库标注 AGPL-3.0-or-later。核心、数据库、WASM wrapper、卡图和翻译数据需分别核对许可证；wrapper 的 MIT 标注不能推导整个组合均为 MIT。任何公开部署或分发前，必须完成组件级许可证审查。


## 2026-11-20：WASM 0.1.6 的核心源码定位

已从 n1xx1/ocgcore-wasm 的 Git 历史确认，0.1.6 发布提交为：

- wrapper release commit：`21c26abd352f1323b578c0b8f49bf8b3d2ceb6a1`（提交信息 `0.1.6`）
- 该提交的 `cpp/ygo` Git submodule 固定到 `edo9300/ygopro-core` commit：`baa3881d0bae48e9994f915f5c931be53c1ba8ef`
- 核心 commit 日期：2026-10-16
- 核心 commit 摘要：召唤/盖放可行性检查逻辑调整
- wrapper 0.1.6 的 `.gitmodules` 指向 `https://github.com/edo9300/ygopro-core.git`；真正可复现的版本应以该发布提交中的 submodule SHA 为准，而不是当前 `master`。

该发现只固定了 wrapper 与核心源码的对应关系，**尚未证明现有 BabelCDB 与 CardScripts 快照完全兼容**。此前记录的 CardScripts SHA `c6ae1aa29f10f678496064a5e8525ade40286d03` 是 2026-11-19 的较新提交，不能仅凭时间较新就认定它与 2026-10-16 的核心完全匹配。必须继续核对核心脚本 API 变更、官方发布说明和最小效果卡脚本实测。

### 当前锁定决策

- WASM wrapper：`@n1xx1/ocgcore-wasm@0.1.6`
- EDOPro core：`edo9300/ygopro-core@baa3881d0bae48e9994f915f5c931be53c1ba8ef`
- BabelCDB：暂不锁定，原候选 SHA 需验证
- CardScripts：暂不锁定，原候选 SHA 需验证
- 禁止将当前 CardScripts/BabelCDB HEAD 直接打包进生产构建，直到完成快照兼容与许可证审查
