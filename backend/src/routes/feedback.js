const express = require("express");
const { persistFeedbackBlock } = require("../services/feedbackGithub");

const router = express.Router();

function readStar1to10(body, key) {
  const n = Number(body[key]);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  if (i < 1 || i > 10) return null;
  return i;
}

async function handleFeedbackPost(req, res) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const text = body.text != null ? String(body.text) : "";
  const coherent = readStar1to10(body, "coherent");
  const valuable = readStar1to10(body, "valuable");
  const flexible = readStar1to10(body, "flexible");
  if (coherent == null || valuable == null || flexible == null) {
    return res.status(400).json({
      message: "请提交三项 1～10 分的评分（coherent、valuable、flexible）",
    });
  }
  const rawLabel = body.label;
  const label = Array.isArray(rawLabel)
    ? rawLabel.map((x) => String(x)).filter((s) => s.length > 0)
    : [];
  const payload = { text, coherent, valuable, flexible, label };
  const receivedAt = new Date().toISOString();
  const block = `${JSON.stringify(payload)}\n时间: ${receivedAt}\n\n`;
  try {
    const meta = await persistFeedbackBlock(block);
    res.json({ ok: true, data: { success: true, ...meta } });
  } catch (err) {
    const code = err && err.message === "MISSING_GITHUB_FEEDBACK_TOKEN" ? 503 : 500;
    const message =
      err && err.message === "MISSING_GITHUB_FEEDBACK_TOKEN"
        ? "反馈存储未配置：请在云托管环境变量中设置 GITHUB_FEEDBACK_TOKEN（需具备仓库 contents 写入权限）"
        : err && err.message
          ? err.message
          : "Failed to persist feedback";
    res.status(code).json({ message });
  }
}

router.post("/feedback", handleFeedbackPost);
/** 兼容改名前的小程序版本或缓存仍请求 /api/evaluation，避免 404 Not Found */
router.post("/evaluation", handleFeedbackPost);

module.exports = router;
