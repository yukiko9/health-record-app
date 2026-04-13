const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const EVALUATION_MD = path.join(__dirname, "..", "..", "evaluation.md");

router.post("/evaluation", (req, res) => {
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
    fs.appendFileSync(EVALUATION_MD, block, "utf8");
    res.json({ ok: true, data: { success: true } });
  } catch (err) {
    const message =
      err && err.message ? err.message : "Failed to write evaluation";
    res.status(500).json({ message });
  }
});

module.exports = router;
