# 打分逻辑说明（与 `utils/score.js` 及流程图对齐）

## 总分

| 项目 | 说明 |
|------|------|
| 基准 | `scoreValue` 默认 60，每次保存叠加 delta |
| 范围 | 0–100 clamp（`app.js` `recalcDailySummary`） |
| 展示 | `scoreDisplay`、`situation`（与 goal 比较） |

---

## 活动 `calcActScore(payload)`

除久坐外：`Math.trunc` 单次贡献，**无 40 分封顶**。

| `panel` | 时间模式 | 距离模式 |
|---------|----------|----------|
| slow-walk-panel | `slowWalkTime * 1.5` | `slowWalkDistance * 0.33` |
| fast-walk-panel | `fastWalkTime * 3.3` | `fastWalkDistance * 0.8` |
| jog-panel | `jogTime * 6.7` | `jogDistance * 1.25` |
| run-panel | `runTime * 6.7` | `runDistance * 1.1` |

### 久坐 `sit-overtime-panel`

- 字段：`sitOvertimeTime`（分钟）、`sitDailyTotalBefore`（本日已累计分钟，由 `act-block` 在保存前写入）。
- 若 `sitDailyTotalBefore + sitOvertimeTime < 300` → delta **0**；否则 `delta = Math.trunc(sitOvertimeTime * 0.5)`。
- 保存成功后：`wx.setStorageSync('sitDailyAccum', { date, total: before + t })`。
- 未传 `sitDailyTotalBefore` 时（如高频快捷），`score.js` 内会 `getSitDailyTotalBefore()` 读本地。

---

## 饮食 `calcEatingScore(payload)`

可选字段：`wineCountToday`、`milkCountToday`（自然日内已保存次数，不含本次）。保存成功后由 `eating-block` 更新 `eatingDailyBtnCounts`。

- **balanced-food-panel**：分项 +5/+5/+3/+3，再乘 fullness 系数（3→×1，2/4→×0.8，1/5→×0.7）。
- **junk-food-panel**：junk -10，drink -5；红酒按本次计次 n（= wineCountToday+1）：1→-2，2→-5，3→-10，≥4→-20；再乘 junk fullness（3→×1，2/4→×1.2，1/5→×1.4）。
- **water-food-panel**：水/果各 +5；牛奶 n≤2 时 +5，否则 0；**不参与 fullness**。
- **组合奖**：仅 `balanced-food-panel` 且蔬菜+蛋白+轻食全选 → +10。
- 最终 `Math.trunc(eatingScore)`，**无 35 封顶**。

### 一日饮食过多（超量惩罚）

本地 `eatingDailyBtnCounts` 中 `vegetable` / `fruit` / `protein`：每成功保存一次饮食且勾选对应 `vegetable-btn` / `fruit-btn` / `protein-btn`，该项 +1（与红酒/牛奶计数同次写入）。

累计扣分（正数，表示当日已从分数中扣掉的总量）：

- 蔬菜：超过 5 份后每份 −1，当日该项最多扣 3 分。
- 水果：超过 4 份后每份 −2，当日该项最多扣 3 分。
- 蛋白：超过 3 份后每份 −2，当日该项最多扣 6 分。

单次保存的 **边际扣分** = `totalPenalty(保存后)` − `totalPenalty(保存前)`；本条饮食 delta = `calcEatingScore(...) − 边际扣分`（实现见 `calcEatingOverwhelmMarginal`）。高频快捷区饮食一行在记分后会同步更新 `eatingDailyBtnCounts`，与保存页一致。

---

## 睡眠 `calcSleepScore(payload)`

`h = sleepHour + sleepHalfHour/60`（小时）。

### 午睡 `sleepMode === 'noon'`

| 条件 | delta |
|------|--------|
| h ≤ 0.5 | +5 |
| h ≤ 1 | +3 |
| h > 1 | +1 |

### 夜间 `sleepMode === 'night'`

| 条件 | delta |
|------|--------|
| h ≤ 5 | `Math.trunc(h * 1.6)` |
| h ≤ 6 | +15 |
| h ≤ 7 | +22 |
| h ≤ 8 | +27 |
| 否则 | +30 |

---

## 页面背景（分数渐变）

非睡眠页使用 `utils/pageBg.js` 的 `getScorePageBackgroundStyle(scoreValue)`，与 `background-color.png` 五档插值。

---

## 微信昵称

本地键 `wxUserNickname`；优先于 dashboard 的 `username`（见 `enter-ui`、`main-ui`）。
