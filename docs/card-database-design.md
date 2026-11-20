# DuelLab 卡牌数据方案（阶段 1）

## 已确认的产品决策

- 默认规则环境：日本 OCG（当前规则；历史规则暂不实现）。
- 收录范围：日本 OCG 官方发行卡牌；纯 TCG 独占卡、Rush Duel、Speed Duel、Master Duel 独有内容不进入标准 OCG 卡池。
- 显示语言：简体中文优先；缺少可靠中文字段时回退显示日文。
- 必须保留日文原始卡名与效果文本，中文翻译不得覆盖原文。
- 卡牌资料、效果脚本、规则验证、图片分别记录状态，不能互相推断。

## 数据源评估

### Project Ignis BabelCDB

候选导入源。其仓库说明表明数据库使用 SQLite CDB，并按 OCG/TCG 双区发行与地区独占发行区分数据；官方卡牌与地区独占卡可能位于不同数据库文件。导入时必须读取数据库字段和 OT/发行标记，不能直接把全部 CDB 合并成 OCG 卡池。

上游：https://github.com/ProjectIgnis/BabelCDB

### YAML Yugi

候选辅助来源，可提供机器可读的 OCG/TCG 卡牌聚合数据及单卡 JSON。其仓库说明明确指出卡牌文本可能受版权保护，代码采用 AGPL-3.0-or-later；不能把代码许可证理解为卡牌文本的再分发许可。只用于字段对照、交叉核验和来源研究，未完成逐字段授权评估前不直接打包其完整卡牌文本。

上游：https://github.com/DawnbrandBots/yaml-yugi

### Konami 官方卡牌数据库

作为卡牌身份、日文名称、卡牌文本和发行信息的优先核验依据。当前没有确认可供本项目直接批量再分发的官方开放数据接口，因此不能假定可以抓取并打包全部官方数据。

官方入口：https://www.db.yugioh-card.com/yugiohdb/

## 内部数据模型（初稿）

每张卡以稳定的 Konami/OCG 卡牌身份为核心，印刷版本与卡牌本体分开：

- `card_id`: 内部稳定 ID
- `konami_id`: 官方数据库 ID（如存在）
- `passcode`: 卡片密码/编号（如存在）
- `name_ja`: 日文原名
- `name_zh_cn`: 简体中文名；缺失时为 null
- `text_ja`: 日文原始效果文本
- `text_zh_cn`: 简体中文效果文本；缺失时为 null
- `type`, `race`, `attribute`, `level`, `atk`, `def`
- `category`: monster / spell / trap
- `monster_subtypes`: 通常、效果、融合、同调、超量、连接、灵摆、仪式等
- `ocg_release_status`: confirmed / unverified / excluded
- `first_ocg_release_date`: 首次 OCG 发行日期（有证据时）
- `source_records`: 来源、来源记录 ID、抓取/核验时间、版本
- `script_status`: missing / available / tested
- `rules_status`: unverified / verified
- `image_status`: missing / available / verified

印刷版本单独记录卡包编号、发行日期、稀有度、语言和地区，避免同一张卡因复刻或异画被重复当成不同卡牌。

## 数据导入约束

1. 先下载并检查上游 CDB 的表结构、字段含义、OT/地区标记和许可证，再决定是否导入。
2. 只将有证据确认属于 OCG 官方发行的记录纳入标准卡池。
3. OCG/TCG 双区发行卡可以纳入；纯 TCG 独占卡排除。
4. 未确认发行区域、预售卡、非官方卡和 Rush Duel 等不同规则产品进入隔离区，不混入标准 OCG 卡池。
5. 使用卡牌密码、Konami ID、日文原名及发行记录进行去重；不能只按中文名去重。
6. 中文翻译记录来源与可信度；没有可靠中文字段时显示日文，不自动编造译名。
7. 数据导入必须可重复执行，保留来源版本与差异日志。

## 第一阶段交付顺序

1. 完成上游 CDB schema / 许可证 / OCG 收录标记核验。
2. 建立可重复的数据抽取与 OCG 筛选脚本。
3. 生成小规模、可审计的样本数据并验证字段映射、去重和语言回退。
4. 通过样本验收后再生成完整索引数据。
5. 网页端接入搜索、详情和加入卡组。
6. 最后再完善卡组校验；在完整卡表与规则约束未接入前，不显示“构筑合法”。

## 当前状态

本文档是数据方案，不代表已导入任何完整卡牌数据库。当前网页仍未接入真实卡牌数据。上游数据的准确性、授权边界、字段映射和 OCG 筛选规则仍需逐项验证。
