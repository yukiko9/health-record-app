# 后端对接说明

## 前端配置

- 在 [`utils/api.js`](utils/api.js) 顶部设置 **`API_BASE`** 为后端根地址（如 `https://api.example.com`，**无末尾斜杠**）。
- **`API_BASE` 留空**：走本地 **mock**（延迟 + 内存 `recent` 列表），便于无后端时预览；**接入真实服务后必须填写**，小程序 `wx.request` 需要完整 `https` 域名并在公众平台配置合法域名。

## `recentActList` 列表语义（三列）

与 [`components/recent-act-list-show`](components/recent-act-list-show) 一致，每条为 `{ do, time, info }`：

| 字段 | 含义 |
|------|------|
| **do** | 模块类型：**「活动」/「饮食」/「睡眠」** |
| **time** | 记录时间展示：**日 + 时 + 分**，与本机 `recordedAt` 一致；前端展示格式为 `MM/DD H时M分`（如 `03/22 14时35分`） |
| **info** | 具体事件描述，与 POST body 中的 **`summary`** 或等价字段一致（如「吃蔬菜，饱食度为4」「慢跑，10min」） |

若 GET 返回「完整记录」（含 `module`、`recordedAt`、`summary`），前端会用 **`mapRecordToRecentItem`** 映射为上述三列；后端也可直接返回已对齐的三字段。

## 接口清单

（路径均以 **`/api`** 为前缀，与 `API_BASE` 拼接。）

### 1) 首页档案（不含最近列表时仍可只用本接口 + 下列 recent）

- **`GET /api/dashboard`**
- 响应（可直接返回 JSON 或包在 `{ data: { ... } }` 中）建议包含：
  - `username: string`（可被小程序本地 **`wxUserNickname`**（用户授权同步）覆盖展示；若需服务端持久化昵称，可增加 **`POST`** 上报接口，见下「可选」）
  - `goal: number`
  - `duration: number`（连胜天数等）
- **说明**：前端 **`fetchUserDashboard`** 会并行调用本接口与 **`GET /api/records/recent`**，用后者结果写入 `recentActList`。若你希望 **dashboard 一次返回 `recentActList`**，需同步改 `utils/api.js` 合并逻辑（当前实现以 **recent 专用接口为准**）。

### 2) 最近活动记录列表

- **`GET /api/records/recent?limit=20`**
- 响应建议：

```json
{
  "list": [
    { "do": "活动", "time": "03/22 14时35分", "info": "慢跑，10min" },
    { "do": "饮食", "time": "03/22 12时10分", "info": "吃蔬菜，饱食度为4" }
  ]
}
```

- 或每条扩展：`id`、`module`（`act`/`eating`/`sleep`）、`recordedAt`（`{ day, hour, minute }`）、`summary`、`payload`；前端将映射为 `do`/`time`/`info`。

### 3) 保存每日目标

- **`POST /api/goal/save`**
- Body：`{ goal: number }`
- 用途：`goal-setting` 页 `save-goal-btn`

### 4) 保存活动记录

- **`POST /api/records/act`**
- Body 在现有页面字段基础上，前端会附加：
  - **`recordedAt`**：`{ day: "MM/DD", hour: number, minute: number }`（本机时间）
  - **`summary`**：人类可读，对应列表 **`info`**（慢走/快走/慢跑/跑步会按 **时间或距离** 二选一生成文案，如「慢走，10min」或「慢走，1000米」）
  - **`actInputMode`**：`"time"` | `"distance"`（仅对 `slow-walk-panel` / `fast-walk-panel` / `jog-panel` / `run-panel` 有意义；**久坐面板**不传或视为仅时间）
- 仍包含：`panel` 与各面板数值字段；**二选一规则**：当 `actInputMode === "time"` 时 **距离类字段应为 0**；当 `actInputMode === "distance"` 时 **时间类字段应为 0**。后端可按 `actInputMode` 校验并入库，重算分时与前端 [`utils/score.js`](utils/score.js) 保持一致。
- **`panel` 互斥**：后端以当前 `panel` 为准采纳有效分支即可。
- **久坐加分（前端本地）**：当日累计久坐分钟数存 `wx.setStorageSync('sitDailyAccum', { date: 'YYYY-MM-DD', total })`；仅当 **累计 + 本次 `sitOvertimeTime` ≥ 300** 时本次加分 `trunc(sitOvertimeTime * 0.5)`。后端若需一致校验，可要求客户端上报 **`sitDailyTotalBefore`** 与本次时长，或自行按用户维度累计当日久坐记录后重算。

### 5) 保存饮食记录

- **`POST /api/records/eating`**
- Body 附加 **`recordedAt`**、**`summary`**；其余含 `panel`、`selectedMap`、`fullness`（见 [`pages/eating-block/index.js`](pages/eating-block/index.js)）。
- **红酒/牛奶当日次数（前端本地）**：`wx.setStorageSync('eatingDailyBtnCounts', { date, wine, milk })`，用于流程图内酒水惩罚与牛奶第三次起不加分的计算。后端若要严格一致，可入库每次勾选并自行计数，或与 [`scoring-reference.md`](scoring-reference.md) 中公式对齐重算。

### 6) 保存睡眠记录

- **`POST /api/records/sleep`**
- Body 附加 **`recordedAt`**、**`summary`**；含 `sleepMode`：`"night"` | `"noon"`，`sleepHour`，`sleepHalfHour`（`0` | `30`）。
- 用途：`sleep-night-block` / `sleep-noon-block` 在用户操作 **`sleep-half-hour`** 时提交（与现交互一致）。
- **夜间睡眠单日唯一（建议后端强校验）**：以用户 **手机本地日历日** 为界（自然日 0 点换日，时区按用户设备）。同一用户在同一自然日内 **`sleepMode: "night"`** 的成功记录 **至多一条**。若重复提交，应返回 **4xx** 与明确 `message`，前端当前亦用本地存储 `nightSleepSavedDate` 做防抖；**午睡 `noon` 不受此限制**（可与产品再确认是否也要限次）。

### 7) 保存响应（推荐）

```json
{ "success": true, "id": "记录ID", "recordedAt": { "day": "03/22", "hour": 14, "minute": 35 } }
```

便于前端重试与对账。

## 五日达标条（`record-week-bar`，原 record-tab 扩展）

设计参考：`record-tab-style-and-logic.png`。首页头部右侧为 **连续 5 个自然日** 的横向条，相对 **今天** 的窗口为 **`today - 3`** ～ **`today + 1`**（共 5 格）。每格展示 **星期英文缩写**（如 Sun.）及 **圆形状态**：

| 状态 | 含义 |
|------|------|
| 灰圈 | 无记录或当日未判定 |
| 绿圈 + 白勾 | 当日 **总分 ≥ 当日目标 goal**（达标） |
| 奖杯 | 可选装饰，与达标同时展示（前端在 `won === true` 时显示） |

- **未来日**（日期 > 今天 0 点）：**不可点击**，前端已禁用交互。
- **今天与过去**：可点击，弹出 **详情浮层**：展示「星期英 + 中文」、**当日 score**、达标/未达标 **不同背景色与表情**。

### 接口：`GET /api/records/week-progress`

- **用途**：为当前首页正在展示的 **5 日窗口** 提供每日摘要（也可约定为返回「滑动窗口」内所有键，由前端按 `dateKey` 取用）。
- **响应建议形态**：

```json
{
  "days": {
    "2026-03-20": { "won": true, "score": 85, "goal": 80 },
    "2026-03-21": { "won": false, "score": 60, "goal": 80 }
  }
}
```

- **`dateKey`**：与前端一致，建议 **`YYYY-MM-DD`**（**用户本地日历日**，与小程序 `Date` 按设备时区计算的日期一致；跨时区用户以服务端约定为准，可再文档化）。
- **`won`**：`boolean`，表示当日是否 **score ≥ goal**（goal 为当日生效目标，若用户改过目标需后端按业务存历史 goal）。
- **`score`**：当日汇总健康分（与前端 `scoreValue` 一致，从基准分叠加各模块 delta）。
- **`goal`**：当日目标分，供浮层与前端展示对比。

若某日无记录，**可不返回该键**；前端将该日视为 **无记录**（灰圈、点击提示「该日暂无记录」）。

### 存储与清理（后端设计意图，供实现参考）

以下为草图说明中的 **逻辑意图**，具体技术选型（对象存储 / 数据库表）由后端决定，**不要求**字面采用文件目录名：

- 可按自然日归档「达标 / 未达标」结果，便于统计与周视图；草图曾示例目录语义 **`days-record/won-days/`**、**`days-record/lost-days/`** 及按日命名的 JSON —— 等价于数据库中按用户 + `dateKey` 存 `won`、`score`、`goal` 即可。
- **周清理**：每周一可清理 **上一自然周** 的临时归档（或仅保留聚合指标），避免无限增长；与前端 **5 日滑动窗口** 独立 —— 前端每次请求仍只需当前窗口内键值。
- 前端 **mock**（`API_BASE` 为空）使用 **`wx.setStorageSync('mockWeekDayMap')`** 模拟 `days` 映射；接入真实接口后应改为上述 GET。

## 最近活动列表 UI（仅前端）

- [`recent-act-list-show`](components/recent-act-list-show) 使用 **`scroll-view`**，**约两条**数据行可视高度，其余记录 **上下滑动** 查看；不改变 `recent` 接口字段。

## 睡眠入口路由（仅前端）

- 用户点击 **`sleep-btn`** 一律进入 **`sleep-night-block`**；在夜间页通过 **`sleep-mode-btn`** 与 **`sleep-noon-block`** 互相切换（`redirectTo`）。

## 可选：审计与排序

- 若需可信排序/跨年，可额外存 **`recordedAtIso`** 或服务端入库时间；展示仍可用 `MM/DD` + 时分。

## 联调顺序建议

1. 配置 **`API_BASE`** 与合法域名。
2. 打通 **`GET /api/records/recent`** 与 **`GET /api/dashboard`**（或合并策略）。
3. 联调 **`POST /api/records/{act,eating,sleep}`**，保存后回到 `main-ui` 应 **`onShow` 拉取** 最新列表。
4. 联调 **`POST /api/goal/save`**。
5. 整链路：三模块保存 + 首页空列表引导文案 + 有数据时列表三列语义校验（表头英文已移除，仅数据行三列）。
6. 联调 **`GET /api/records/week-progress`** 与五日条、详情浮层。
7. 校验 **夜间睡眠同日唯一**（POST 重复夜间应失败）与前端 `nightSleepSavedDate` 一致体验。
8. 活动保存 body 含 **`actInputMode`** 与 **时间/距离二选一** 字段合法性。

## 主界面无数据时的文案

当 **`recentActList` 为空**（首次使用或后端无记录），列表区域展示两行引导语（见 [`pages/main-ui/index.wxml`](pages/main-ui/index.wxml)），**不展示假数据行**。

## 高频快捷区（highRateAct / `high-rate-act`）

**位置**：[`main-ui`](pages/main-ui/index.wxml) 的 `do-list-panel` 内、三个模块入口按钮 **上方**；深色槽内 **固定两行**，每行 class **`high-rate-act`**（与外层容器同名，通过父子选择器区分样式），三列文案与 **`recentActList` 完全一致**（`do` / `time` / `info`）。

**产品意图**：面向通勤/饮食/作息规律用户，用 **两条最常重复** 的历史事件做「一键再记」入口，减少进模块页操作次数。

### 统计与选取规则（后端）

- **`GET /api/records/high-rate?limit=2`**
- 在用户历史记录中，以 **`info` 字符串** 为键统计频次（是否做规范化如去空格由后端约定并文档化）。
- **若存在任意 `info` 出现次数 > 1**：按频次从高到低取 **不同 `info`** 的代表记录，凑满 2 条（同频次可用 **更近的 `recordedAt`** 打破平局）。
- **若所有 `info` 均只出现 1 次**（无重叠）：返回该用户 **时间最新的两条记录**（任意模块）。
- 响应 `list` 可为 0–2 条；前端会将不足 2 条时用占位行补齐（`—`，不可点）。

### 每条记录必备字段（供前端算分）

展示字段仍建议直接给出 `do`、`time`、`info`（与 recent 一致），并 **必须** 附带：

- **`module`**：`act` | `eating` | `sleep`（与 `app.globalData.moduleScore` 键一致）
- **`scorePayload`**：与对应 **`POST /api/records/{act,eating,sleep}`** 的请求体同结构的可计算子集（至少满足 [`utils/score.js`](utils/score.js) 中 `calcActScore` / `calcEatingScore` / `calcSleepScore` 的入参要求）

前端在用户点击某一行时，用 **`scorePayload` + `module`** 计算本条 **delta**（与 [`scoring-reference.md`](scoring-reference.md) 一致；饮食会合并本地 `eatingDailyBtnCounts`，久坐会读 `sitDailyAccum`），通过 **`app.addModuleScoreDelta`** 叠加到全局 **`scoreValue`**（再 0–100 clamp），**不调用后端算分**。

### 可选二期：快速落库

若需高频区点击后 **recent 与统计同步**，可增加 **`POST /api/records/quick-log`**（body 含 `module`、`scorePayload`、`recordedAt`），仅存档；当前实现可不接此接口。

### Mock 行为（`API_BASE` 为空）

前端在内存 `mockRecentList` 上模拟「按 `info` 频次 / 否则最新两条」，并在保存三条 POST 时为每条记录附带 `module` + `scorePayload`，便于本地联调高频区点击记分。
