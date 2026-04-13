const express = require("express");
const path = require("path");
const {
  appendFeedbackBlock,
  tryCommitPushFeedback,
} = require("../services/feedbackStore");

const router = express.Router();

/**
 * 默认：与本文件相对路径 backend/feedback.md（与 GitHub 上 main/backend/feedback.md 一致）。
 * 云托管若只拷贝 backend 子目录、却把完整仓库 clone 在别处，请设 FEEDBACK_MARKDOWN_ABSPATH 指向该仓库里的 backend/feedback.md，
 * 与 FEEDBACK_GIT_REPO_ROOT（仓库根，含 .git 与 backend/）一致。
 */
function resolveFeedbackMdPath() {
  const envPath = process.env.FEEDBACK_MARKDOWN_ABSPATH;
  if (envPath != null && String(envPath).trim()) {
    return path.resolve(String(envPath).trim());
  }
  return path.join(__dirname, "..", "..", "feedback.md");
}

const FEEDBACK_MD = resolveFeedbackMdPath();

router.post("/feedback", (req, res) => {
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
    appendFeedbackBlock(FEEDBACK_MD, block);
    tryCommitPushFeedback(FEEDBACK_MD);
    res.json({ ok: true, data: { success: true } });
  } catch (err) {
    const message =
      err && err.message ? err.message : "Failed to write feedback";
    res.status(500).json({ message });
  }
});

module.exports = router;
