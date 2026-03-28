# 后端对接说明

**接口路径级速查（给设计者）**：另见同目录 [`API.md`](API.md)。

## 给后端实现者 · 易错点（2026-03 核对）

| 主题                | 说明                                                                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **计分公式**        | 与活动走跑、骑行、饮食超量边际等相关的**唯一实现**在 [`utils/score.js`](utils/score.js)。[`scoring-reference.md`](scoring-reference.md) 为说明文档，**若与 `score.js` 冲突，以代码为准**（仓库根目录另有同名 `scoring-reference.md`，同样仅作参考）。 |
| **用户 / 鉴权**     | 当前 [`api.js`](utils/api.js) 请求**无**统一 Token；所有资源默认「单机 mock」。正式环境必须为每条接口约定 **用户维度** 与 **Header**，并由前端改 `requestJson` / `uploadAiAnalyzeImage`。                                                             |
| **`wx.uploadFile`** | AI 识图使用 **`uploadFile`**，微信公众平台需配置 **uploadFile 合法域名**（与 request 列表**分别**配置）。                                                                                                                                             |
| **AI 响应与 HTTP**  | `uploadAiAnalyzeImage` 成功回调内**未判断** `statusCode`；建议接口 **200** 返回 JSON（字段 `sleepHour` / `calorie`），避免依赖 4xx body。                                                                                                             |
| **最近列表 `time`** | 若 `GET /api/records/recent` 返回的 `time` 为 `"MM/DD 14时35分"` 这类字符串，前端 [`mapRecordToRecentItem`](utils/api.js) 会 **去掉日期前缀**，列表上仍只显示 **时、分**。                                                                            |
| **弱网表现**        | `fetchHighRateActList`、`fetchWeekProgress` 在失败时**静默降级**（占位行 / 空 `days`），不弹 Toast；联调时勿仅凭界面判断接口是否通。                                                                                                                  |

## 前端配置

- 在 [`utils/api.js`](utils/api.js) 顶部设置 **`API_BASE`** 为后端根地址（如 `https://api.example.com`，**无末尾斜杠**）。
- **`API_BASE` 留空**：走本地 **mock**（延迟 + 内存 `recent` 列表），便于无后端时预览；**接入真实服务后必须填写**，小程序 `wx.request` 需要完整 `https` 域名并在公众平台配置合法域名。

## `recentActList` 列表语义（三列）

与 [`components/recent-act-list-show`](components/recent-act-list-show) 一致，每条为 `{ do, time, info }`：

| 字段     | 含义                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **do**   | 模块类型：**「活动」/「饮食」/「睡眠」**                                                                                            |
| **time** | 记录时间展示：**仅「时、分」**（如 `14时35分`）；后端可仍返回 `recordedAt: { day, hour, minute }`，前端会格式化为时分并**省略日期** |
| **info** | 具体事件描述，与 POST body 中的 **`summary`** 或等价字段一致（如「吃蔬菜，饱食度为4」「慢跑，10min」）                              |

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
  - **`summary`**：人类可读，对应列表 **`info`**（慢走/快走/慢跑/跑步/**骑行**会按 **时间或距离** 二选一生成文案，如「慢走，10min」「骑行，1200米」）
  - **`actInputMode`**：`"time"` | `"distance"`（对 `slow-walk-panel` / `fast-walk-panel` / `jog-panel` / `run-panel` / **`ride-panel`** 有意义；**久坐面板**不传或视为仅时间）
- 仍包含：`panel` 与各面板数值字段；**二选一规则**：当 `actInputMode === "time"` 时 **距离类字段应为 0**；当 `actInputMode === "distance"` 时 **时间类字段应为 0**。后端可按 `actInputMode` 校验并入库，重算分时与前端 [`utils/score.js`](utils/score.js) 保持一致。
- **`ride-panel`（通勤骑行）**：`rideTime`（分钟）、`rideDistance`（米）；前端计分：`min(6, round(时间公式或 0.373*距离))`，与 `actInputMode` 二选一有效分支一致。
- **`panel` 互斥**：后端以当前 `panel` 为准采纳有效分支即可。
- **久坐加分（前端本地）**：当日累计久坐分钟数存 `wx.setStorageSync('sitDailyAccum', { date: 'YYYY-MM-DD', total })`；仅当 **累计 + 本次 `sitOvertimeTime` ≥ 300** 时本次加分 `trunc(sitOvertimeTime * 0.5)`。后端若需一致校验，可要求客户端上报 **`sitDailyTotalBefore`** 与本次时长，或自行按用户维度累计当日久坐记录后重算。

### 5) 保存饮食记录

- **`POST /api/records/eating`**
- Body 附加 **`recordedAt`**、**`summary`**；其余含 `panel`、`selectedMap`、`fullness`（见 [`pages/eating-block/index.js`](pages/eating-block/index.js)）。
- **junk-food-panel 扩展**：`selectedMap` 可含 **`milktea-btn`**、**`puffed-food-btn`**；另传 **`milkteaSugar`**：`full` | `half` | `light` | `none`（全糖/半糖/微糖/无糖），影响奶茶扣分档位。
- **water-food-panel 扩展**：`selectedMap` 可含 **`coffee-btn`**；另传 **`coffeeCountToday`**（保存**前**当日已记咖啡次数，不含本条），用于第 1 杯 +1 分、第 2 杯 0 分、≥3 杯 -1 分（与 [`calcEatingScore`](utils/score.js) 一致）。
- **饮食当日计数（前端本地）**：`wx.setStorageSync('eatingDailyBtnCounts', { date, wine, milk, coffee, vegetable, fruit, protein })`。`wine` / `milk` / `coffee` 用于酒、奶、咖啡阶梯计分；`vegetable`/`fruit`/`protein` 为当日已保存份数（每次保存若勾选对应 `*-btn` 则 +1），用于 [超量惩罚](scoring-reference.md)。后端若要严格一致，可按日累计各按钮次数并重算。

### 6) 保存睡眠记录

- **`POST /api/records/sleep`**
- Body 附加 **`recordedAt`**、**`summary`**；含 `sleepMode`：`"night"` | `"noon"`，`sleepHour`，`sleepHalfHour`（`0` | `30`）。
- 用途：`sleep-night-block` / `sleep-noon-block` 在用户操作 **`sleep-half-hour`** 时提交（与现交互一致）。
- **午睡二次不加分**：Body 含 **`noonSleepSavesBefore`**（整数，本条请求发起前当日已成功保存的午睡次数）。前端规则：若 **`noonSleepSavesBefore >= 1`**，则本条午睡模块分为 **0**（仍允许落库）。后端可对 `sleepMode: "noon"` 校验该字段与用户维度当日午睡次数一致。前端本地另用 `wx.setStorageSync('noonSleepSaves', { date: 'YYYY-MM-DD', count })` 累计次数。
- **夜间睡眠单日唯一（建议后端强校验）**：以用户 **手机本地日历日** 为界（自然日 0 点换日，时区按用户设备）。同一用户在同一自然日内 **`sleepMode: "night"`** 的成功记录 **至多一条**。若重复提交，应返回 **4xx** 与明确 `message`，前端当前亦用本地存储 `nightSleepSavedDate` 做防抖；**午睡 `noon` 不受「每日一条」限制**（可与产品再确认是否也要限次）。

### 7) 保存响应（推荐）

```json
{
  "success": true,
  "id": "记录ID",
  "recordedAt": { "day": "03/22", "hour": 14, "minute": 35 }
}
```

便于前端重试与对账。

### 8) AI 识图分析（主界面 `ai-analyze-btn`）（注意这里可能用到deepseek api key，要在后端接入deepseek api（chat模式），需要时直接找redy即可）

- **`POST /api/ai/analyze`**（`API_BASE` 已配置且非 mock 时，前端通过 **`wx.uploadFile`** 调用；**multipart** 字段名 **`image`**，值为用户选择的截图临时文件。）
- **鉴权**：与现有业务一致（如 Header 带 token）；**Deepseek API Key（由redy提供）、提示词模板均只放在后端**，小程序不持有密钥。
- **响应**（可直接 JSON 或包在 `{ data: { ... } }`）：至少包含可选字段 **`sleepHour`**、**`calorie`**（均为 number；缺失时用 `null`/`undefined` 表示未识别）。
  - **`sleepHour`**：夜间睡眠时长（**小时**，允许小数，如 `7.5`）；前端会按 30 分钟粒度对齐后喂给 [`calcSleepScore`](utils/score.js)（`sleepMode: "night"`）。
  - **`calorie`**：活动热量（千卡或其它与产品约定一致的单位）；前端换算活动分：`heatScore = min(20, 20 * (1 - exp(-calorie/800)))`。
- **前端行为摘要**（与流程图一致，**不写** `recentActList`、**不**新增记录类 POST）：
  - 二者皆未识别 → 弹窗提示重新上传。
  - 仅缺其一 → 缺失侧按 **0** 处理，并 Toast 提示「只获取到活动热量值！」或「只获取到睡眠时间！」。
  - 用 **`heatScore` 覆盖当日活动模块分**：从全局分中扣掉当前 `moduleScore.act` 再加 `heatScore`，并令 **`moduleScore.act = heatScore`**（历史活动记录列表保留，仅分数按产品逻辑重算）。
  - **夜间睡眠**：从全局分与 `moduleScore.sleep` 中扣除本日已计入的夜间分（本地 **`nightSleepScoreApplied`**，与手工保存夜间页写入一致），再按新 `sleepHour` 加分；并写入 **`nightSleepSavedDate`**，与「每日一条夜间」一致。
- **本地存储键**（供后端对账或迁移参考）：`nightSleepScoreApplied`：`{ date: 'YYYY-MM-DD', delta: number }`。

#### AI 分析提示词（后端填写）

以下由 **后端设计者** 将实际发给模型的系统/用户提示词粘贴到部署配置或密钥管理中；**勿**写进小程序仓库。

```
<!-- PROMPT_PLACEHOLDER_START -->
现在你是一个用于自动识别并获取、打印用户健康数据的机器人。这是一个健康应用的主界面截图识别出来的文字，请你识别睡眠时间（单位为小时）和热量（单位为卡路里），以json格式输出（下面** **里的内容都必须完全是数字形式）：{"sleepHour": **你获取到的睡眠时长数据**, "calorie": **你获取到的卡路里消耗量，转换单位为kJ**}未获取到数据的属性值直接改为undefined。
<!-- PROMPT_PLACEHOLDER_END -->
```

## 五日达标条（`record-week-bar`，原 record-tab 扩展）

设计参考：`record-tab-style-and-logic.png`。首页头部右侧为 **连续 5 个自然日** 的横向条，相对 **今天** 的窗口为 **`today - 3`** ～ **`today + 1`**（共 5 格）。每格展示 **星期英文缩写**（如 Sun.）及 **圆形状态**：

| 状态        | 含义                                                     |
| ----------- | -------------------------------------------------------- |
| 灰圈        | 无记录或当日未判定                                       |
| 绿圈 + 白勾 | 当日 **总分 ≥ 当日目标 goal**（达标）                    |
| 奖杯        | 可选装饰，与达标同时展示（前端在 `won === true` 时显示） |

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
2. 实现 **`POST /api/ai/analyze`**（密钥与提示词仅后端），与主界面 **`ai-analyze-btn`** 联调上传与 JSON 字段。
3. 打通 **`GET /api/records/recent`** 与 **`GET /api/dashboard`**（或合并策略）。
4. 联调 **`POST /api/records/{act,eating,sleep}`**，保存后回到 `main-ui` 应 **`onShow` 拉取** 最新列表。
5. 联调 **`POST /api/goal/save`**。
6. 整链路：三模块保存 + 首页空列表引导文案 + 有数据时列表三列语义校验（表头英文已移除，仅数据行三列）。
7. 联调 **`GET /api/records/week-progress`** 与五日条、详情浮层。
8. 校验 **夜间睡眠同日唯一**（POST 重复夜间应失败）与前端 `nightSleepSavedDate` 一致体验。
9. 活动保存 body 含 **`actInputMode`** 与 **时间/距离二选一** 字段合法性。

## 主界面无数据时的文案

当 **`recentActList` 为空**（首次使用或后端无记录），列表区域展示两行引导语（见 [`pages/main-ui/index.wxml`](pages/main-ui/index.wxml)），**不展示假数据行**。

## 高频快捷区（highRateAct / `high-rate-act`）

**位置**：[`main-ui`](pages/main-ui/index.wxml) 的 `do-list-panel` 内、三个模块入口按钮 **上方**；深色槽内 **固定两行**，每行 class **`high-rate-act`**（与外层容器同名，通过父子选择器区分样式），**展示为两列**：`do`（类型）与 `info`（摘要），**不再展示 `time`**；占位比约 **1 : 2**。后端仍可返回 `time` 供审计，前端忽略展示。

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

前端在用户点击某一行时，用 **`scorePayload` + `module`** 计算本条 **delta**（与 [`scoring-reference.md`](scoring-reference.md) 一致；饮食会合并本地 `eatingDailyBtnCounts`（含 **`coffee`**），并沿用 payload 中的 **`milkteaSugar`**；久坐会读 `sitDailyAccum`），通过 **`app.addModuleScoreDelta`** 叠加到全局 **`scoreValue`**（再 0–100 clamp），**不调用后端算分**。

### 可选二期：快速落库

若需高频区点击后 **recent 与统计同步**，可增加 **`POST /api/records/quick-log`**（body 含 `module`、`scorePayload`、`recordedAt`），仅存档；当前实现可不接此接口。

### Mock 行为（`API_BASE` 为空）

前端在内存 `mockRecentList` 上模拟「按 `info` 频次 / 否则最新两条」，并在保存三条 POST 时为每条记录附带 `module` + `scorePayload`，便于本地联调高频区点击记分。
