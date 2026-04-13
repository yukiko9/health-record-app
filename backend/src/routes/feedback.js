const express = require("express");
const path = require("path");
const {
  appendFeedbackBlock,
  tryCommitPushFeedback,
} = require("../services/feedbackStore");

const router = express.Router();

const FEEDBACK_MD = path.join(__dirname, "..", "..", "feedback.md");

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
