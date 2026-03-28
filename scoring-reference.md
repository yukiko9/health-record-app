# 打分逻辑说明（与 `utils/score.js` 一致）

> **服务端重算 / 校验 delta**：请以 **[`utils/score.js`](utils/score.js)** 为唯一实现依据。本文是对该文件的摘要；若与代码不一致，**以代码为准**。  
> 仓库根目录另有 `scoring-reference.md`，内容可能过时，**请勿用于对接本小程序**。

## 总分

| 项目 | 说明 |
|------|------|
| 基准 | `scoreValue` 默认 60，每次保存叠加 delta |
| 范围 | 0–100 clamp（`app.js` `recalcDailySummary`） |
| 展示 | `scoreDisplay`、`situation`（与 goal 比较） |

---

## 活动 `calcActScore(payload)`

- `actInputMode === "distance"` 时用距离分支，否则用时间分支（`time` 单位为分钟；`distance` 为界面数值，与 `api.js` 字段一致）。
- 除 **骑行** 外，慢走/快走/慢跑/跑步：`Math.round(raw)`，**无 0–40 封顶**。
- **骑行** `ride-panel`：`Math.round(Math.min(6, raw))`（单次贡献上限 **6**）。

### 久坐 `sit-overtime-panel`

- 字段：`sitOvertimeTime`（分钟）、`sitDailyTotalBefore`（本日已累计分钟）。
- 若 `sitDailyTotalBefore + sitOvertimeTime < 300` → **0**；否则 `Math.trunc(sitOvertimeTime * 0.5)`。
- 未传 `sitDailyTotalBefore` 时由 `getSitDailyTotalBefore()` 读本地 `sitDailyAccum`。

### 慢走 / 快走 / 慢跑 / 跑步 / 骑行（`raw` 公式摘要）

| `panel` | 距离模式 `raw` | 时间模式 `raw` |
|---------|----------------|----------------|
| `slow-walk-panel` | `slowWalkDistance * 0.00465` | `((1 - 0.9^slowWalkTime) / 0.1) * 0.467` |
| `fast-walk-panel` | `fastWalkDistance * 0.006` | `0.7464 * (1 - 0.88^fastWalkTime) / 0.12` |
| `jog-panel` | `jogDistance * 0.007` | `1.494 * (1 - 0.88^jogTime) / 0.15` |
| `run-panel` | `runDistance * 0.009` | `1.8664 * (1 - 0.82^runTime) / 0.18` |
| `ride-panel` | `0.373 * rideDistance` | `1.6 * (1 - 0.88^rideTime) / 0.12` |

（`^` 表示幂运算；时间字段为 0 时需与 JS 数值运算一致。）

---

## 饮食 `calcEatingScore(payload)` 与超量

可选字段：`wineCountToday`、`milkCountToday`、`coffeeCountToday`（自然日内已保存次数，不含本次）。`fullness` 默认 3。

### `balanced-food-panel`

- 勾选：`vegetable-btn` +2，`protein-btn` +2，`light-btn` +1，`no-drink-btn` +1。
- 再乘 `fullnessMultBalanced(fullness)`：3→×1；2 或 4→×0.9；其余→×0.7。
- 若同时勾选蔬菜、蛋白、轻食 → 再 **+2**。

### `junk-food-panel`

- `junk-btn` −6，`drink-btn` −2，`puffed-food-btn` −2。
- `drink-wine-btn`：本次计次 `n = wineCountToday + 1`，`winePenaltyForN`：n≤1→−3，n=2→−5，否则→−9。
- `milktea-btn`：按 `milkteaSugar`（`full`→−5，`half`→−3，`light`→−2，`none`→−1，缺省→0）。
- 再乘 `fullnessMultJunk(fullness)`：3→×1；2→×0.9；1→×0.7；4→×1.2；其余→×1.4。

### `water-food-panel`

- `drink-water-btn` +1，`fruit-btn` +2。
- `drink-milk-btn`：`n = milkCountToday + 1`，若 `n <= 2` 则 +5。
- `coffee-btn`：`n = coffeeCountToday + 1`，n=1→+1，n=2→0，否则→−1。
- **不参与 fullness 系数**。

最终返回 `Math.trunc(eatingScore)`。

### 一日饮食过多（超量惩罚）

见 `totalEatingOverwhelmPenalty` / `calcEatingOverwhelmMarginal`：蔬菜>5、水果>4、蛋白>3 后的边际扣分；本条 delta 为 `calcEatingScore(...) + calcEatingOverwhelmMarginal(...)`（边际为 ≤0 的增量）。

---

## 睡眠 `calcSleepScore(payload)`

`h = sleepHour + sleepHalfHour / 60`（小时）。

### 午睡 `sleepMode === "noon"`

- 若 `noonSleepSavesBefore >= 1` → **0**。
- 若 `h <= 0.5` → **3**；若 `h <= 1` → **2**；否则 → **0**。

### 夜间 `sleepMode === "night"`

- `h < 4` 或 `h > 12` → **0**。
- `h < 5` 或 `h > 11` → **2**。
- `h < 6` 或 `h > 10` → **4**。
- `h < 7` 或 `h > 9` → **7**。
- 否则 → **8**。

---

## 页面背景（分数渐变）

非睡眠页使用 `utils/pageBg.js` 的 `getScorePageBackgroundStyle(scoreValue)`，与 `background-color.png` 五档插值。

---

## 微信昵称

本地键 `wxUserNickname`；优先于 dashboard 的 `username`（见 `enter-ui`、`main-ui`）。
