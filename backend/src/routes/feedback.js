const express = require("express");
const { persistFeedbackBlock } = require("../services/feedbackGithub");

const router = express.Router();

async function handleFeedbackPost(req, res) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const text = body.text != null ? String(body.text) : "";
  const rawLabel = body.label;
  const label = Array.isArray(rawLabel)
    ? rawLabel.map((x) => String(x)).filter((s) => s.length > 0)
    : [];
  const payload = { text, label };
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
