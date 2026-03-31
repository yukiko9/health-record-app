const express = require("express");
const multer = require("multer");
const { analyzeImageWithDeepseek } = require("../services/deepseek");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/ai/analyze", upload.single("image"), async (req, res) => {
  try {
    const result = await analyzeImageWithDeepseek(req.file);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      message: err && err.message ? err.message : "AI 分析失败",
      sleepHour: null,
      calorie: null
    });
  }
});

module.exports = router;
