# DuelLab 卡牌数据源核验记录（2026-11-20）

## 本轮核验结论

本轮完成上游项目说明与公开仓库结构核验；没有下载或执行 SQLite 数据库，也没有导入卡牌数据。因此以下结论不等于完成了数据库级验证。

### 1. Project Ignis BabelCDB

来源：
- https://github.com/ProjectIgnis/BabelCDB
- https://github.com/ProjectIgnis/BabelCDB/blob/master/README.md

README 明确说明：
- 数据库是供 EDOPro 使用的 SQLite3 CDB 文件。
- 新卡先以 preRelease CDB 形式存在；正式发行后更新卡牌 ID 并移除 prerelease OT。
- 同时在 OCG 与 TCG 发售的卡片会移动到 official.cdb。
- 仅在单一区域发行的卡片可保留在独立 release + setname 文件中。
- Rush Duel 有独立数据库与 prerelease 文件。
- unofficial 卡牌有独立数据库。

**对 DuelLab 的影响：**
- official.cdb 是较强的 OCG/TCG 双区正式发行候选集合，但不能据此覆盖全部 OCG-only 卡。
- OCG-only 卡需要从对应地区发行数据库中识别，不能只导入 official.cdb。
- 不能导入全部 release、prerelease、unofficial、Rush 或 skills 文件后就称为 OCG 官方卡池。
- README 的发行分类规则可用于制定筛选流程，但实际导入必须进一步读取 CDB 内部记录、字段和 OT 值，并抽样核对发行证据。

### 2. YAML Yugi

来源：
- https://github.com/DawnbrandBots/yaml-yugi
- https://github.com/DawnbrandBots/yaml-yugi/blob/master/README.md
- https://dawnbrandbots.github.io/yaml-yugi/cards.json

README 说明：
- 项目目标覆盖 TCG、OCG、Master Duel、Rush Duel、Speed Duel。
- cards.json 是包含 OCG/TCG 卡片（包括 prerelease）的聚合数据，不应直接视为纯 OCG 官方卡池。
- 单卡数据可按卡片密码或 Konami 数据库 ID 查找。
- README 明确指出大部分卡牌文本版权归 Studio Dice / SHUEISHA / TV TOKYO / KONAMI。
- 仓库其余流水线源代码使用 AGPL-3.0-or-later；该代码许可证不授予卡牌文本再分发权。

**对 DuelLab 的影响：**
- 可作为辅助字段来源、语言资料对照和交叉核验入口。
- 必须根据每张卡的发行地区和产品类型过滤。
- 未经独立授权评估，不把聚合数据中的完整卡牌文本复制并随 DuelLab 分发。
- 简体中文字段覆盖率及其与日本 OCG 正式发行版本的对应关系，需要抽样检查。

## 当前可确定与尚不能确定的事项

| 项目 | 状态 | 说明 |
|---|---|---|
| CDB 文件采用 SQLite3 | 已由上游 README 确认 | 具体表结构仍需读取实际文件 |
| OCG/TCG 双区卡转入 official.cdb | 已由上游 README 确认 | 不代表 OCG-only 卡全部在其中 |
| OCG-only 卡分布于地区发行文件 | README 提供分类规则 | 具体文件清单与 OT 值待逐文件审计 |
| prerelease 与正式卡区分 | 已由 README 确认 | 需要排除未正式发行记录 |
| Rush / unofficial / skills 独立分类 | 仓库文件与 README 可见 | 导入时必须排除 |
| 中文文本覆盖率 | 未验证 | 需样本统计 |
| 完整 OCG 历史覆盖率 | 未验证 | 需逐发行产品核验 |
| 卡牌文本再分发许可 | 未获确认 | 不能因代码开源而推断数据可自由分发 |
| CDB 内部字段和 OT 数值映射 | 未验证 | 必须读取真实 CDB 和 EDOPro 对应定义 |

## 下一项技术验证

取得上游 CDB 文件的只读副本，使用 SQLite 只读方式检查：
1. sqlite_master 中实际表名与建表语句；
2. datas、texts（若存在）字段类型与主键；
3. 正式卡、地区发行卡、预售卡和非官方卡的 OT 值分布；
4. 以若干已知 OCG 卡及 OCG-only 卡为样本，核对卡名、密码、效果文本、发行产品；
5. 统计中文数据源对这些样本的覆盖情况。

在这些验证完成前，不生成或发布“全量 OCG 卡牌数据库”，也不把数据状态标记为已验证。