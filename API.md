# 健康小程序 · 后端接口说明（设计者版）

本文档与 [`utils/api.js`](utils/api.js) 中的路径、方法一致，供后端实现与联调。根地址由小程序配置为 **`API_BASE`**（无末尾斜杠），所有路径均与其拼接。

**通用约定**

- 成功响应可使用 **裸 JSON** 或 **`{ data: ... }`** 包裹；文中「业务体」指 `data` 解包后的对象。
- 除文件上传外，建议 **`Content-Type: application/json`**。
- 鉴权方式（如 `Authorization`）由项目统一约定，本文不展开。

---

## 1. 首页档案

| 项目 | 说明 |
|------|------|
| **方法 / 路径** | `GET /api/dashboard` |
| **业务体字段** | `username: string`，`goal: number`，`duration: number`（连胜天数等） |

---

## 2. 最近记录列表

| 项目 | 说明 |
|------|------|
| **方法 / 路径** | `GET /api/records/recent?limit=20` |
| **业务体** | `list: array`，元素经前端 [`mapRecordToRecentItem`](utils/api.js) 映射为 `{ do, time, info }` |

**字段语义**

| 字段 | 说明 |
|------|------|
| `do` | 模块文案：**「活动」/「饮食」/「睡眠」**（或直接给 `module: act|eating|sleep` 由前端推导） |
| `time` | **仅时分**，如 `14时35分`；也可给 `recordedAt: { day, hour, minute }` 由前端格式化（**不再要求带日期**） |
| `info` | 与保存时 **`summary`** 一致的人类可读描述 |

---

## 3. 高频快捷区

| 项目 | 说明 |
|------|------|
| **方法 / 路径** | `GET /api/records/high-rate?limit=2` |
| **业务体** | `list: array`，0～2 条；选取规则见 [`backend-integration.md`](backend-integration.md) |

每条除展示用 `do`、`time`（可选）、`info` 外，**必须**包含：

| 字段 | 说明 |
|------|------|
| `module` | `act` \| `eating` \| `sleep` |
| `scorePayload` | 与对应保存接口可计算子集一致，供前端本地 `calcActScore` / `calcEatingScore` / `calcSleepScore` 使用 |

**饮食类 `scorePayload` 须能还原计分**，至少包括：`panel`、`selectedMap`、`fullness`、`wineCountToday`、`milkCountToday`、**`coffeeCountToday`**（保存时的当日已记次数，不含本条）、**`milkteaSugar`**（`full`/`half`/`light`/`none`，与 junk 面板奶茶选项一致）。

**活动类** 若含 **`ride-panel`**，须含 `rideTime`、`rideDistance`、`actInputMode`。

**睡眠类午睡** 须含 **`noonSleepSavesBefore`**（本条保存前当日已成功保存午睡次数，整数），以便与「当日第二次午睡 0 分」规则一致。

---

## 4. 保存活动记录

| 项目 | 说明 |
|------|------|
| **方法 / 路径** | `POST /api/records/act` |
| **Body** | 前端在表单字段上附加 `recordedAt`、`summary`（见 [`backend-integration.md`](backend-integration.md)） |

**新增 / 强调字段**

| 字段 | 说明 |
|------|------|
| `panel` | 可为 **`ride-panel`**（通勤骑行） |
| `rideTime` / `rideDistance` | 骑行面板：与 `actInputMode` **二选一**有效（时间模式距离为 0，反之亦然） |
| `actInputMode` | `ride-panel` 与走跑类相同：`time` \| `distance` |

---

## 5. 保存饮食记录

| 项目 | 说明 |
|------|------|
| **方法 / 路径** | `POST /api/records/eating` |
| **Body** | `panel`、`selectedMap`、`fullness`，以及前端附加的 `recordedAt`、`summary` |

**须持久化或可还原的字段（与计分 / 文案一致）**

| 字段 | 说明 |
|------|------|
| `selectedMap` | 含 **`milktea-btn`**、**`puffed-food-btn`**、**`coffee-btn`** 等布尔项 |
| `milkteaSugar` | `full` \| `half` \| `light` \| `none`（仅 junk 面板勾选奶茶时有意义） |
| `wineCountToday` / `milkCountToday` / **`coffeeCountToday`** | 保存**当下**的当日已记次数（**不含**本条），用于酒、奶、咖啡阶梯计分 |

---

## 6. 保存睡眠记录

| 项目 | 说明 |
|------|------|
| **方法 / 路径** | `POST /api/records/sleep` |
| **Body** | `sleepMode: "night" \| "noon"`，`sleepHour`，`sleepHalfHour`（`0` \| `30`），以及 `recordedAt`、`summary` |

**午睡额外字段**

| 字段 | 说明 |
|------|------|
| `noonSleepSavesBefore` | 非负整数；**本条提交前**当日已成功保存的午睡次数。为 `0` 时按时长计分；**≥1 时本条午睡分为 0**（与前端 [`calcSleepScore`](utils/score.js) 一致）。 |

---

## 7. 保存每日目标

| 项目 | 说明 |
|------|------|
| **方法 / 路径** | `POST /api/goal/save` |
| **Body** | `{ goal: number }` |

---

## 8. 五日进度条

| 项目 | 说明 |
|------|------|
| **方法 / 路径** | `GET /api/records/week-progress` |
| **业务体** | `{ days: { "YYYY-MM-DD": { won, score, goal } } }` |

---

## 9. AI 识图分析（multipart）

| 项目 | 说明 |
|------|------|
| **方法 / 路径** | `POST /api/ai/analyze` |
| **请求** | `multipart/form-data`，字段名 **`image`**（本地临时文件） |
| **业务体** | 可选数字字段 **`sleepHour`**、**`calorie`**；识别失败可省略 |

详见 [`backend-integration.md`](backend-integration.md) 第 8 节（AI 识图）。

---

## 10. 错误与幂等（建议）

- 保存类接口建议返回 `success`、`id`、`recordedAt` 等，便于前端 Toast 与列表刷新。
- **夜间睡眠** 同日仅一条：重复 `sleepMode: "night"` 建议 **4xx** + 明确 `message`（与前端 `nightSleepSavedDate` 防抖一致）。

---

## 修订记录（摘要）

- 最近列表 **`time`** 仅为 **时、分**；高频区展示 **两列**（`do` : `info` = 1:2）。
- 活动新增 **`ride-panel`** 及 `rideTime` / `rideDistance`。
- 饮食新增 **奶茶含糖量**、**膨化**、**咖啡**及 `coffeeCountToday` 等计分依赖字段。
- 午睡 **`noonSleepSavesBefore`** 与本地 **`noonSleepSaves`** 计数对齐第二次起 0 分。
