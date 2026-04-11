const express = require("express");
const multer = require("multer");
const {
  analyzeImageWithDeepseek,
  analyzeOcrTextWithDeepseek
} = require("../services/deepseek");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/** 前端 OCR + 后端 DeepSeek：仅传识别文本 */
router.post("/ai/analyze-text", async (req, res) => {
  const ocrText = req.body && req.body.ocrText;
  if (ocrText == null || !String(ocrText).trim()) {
    return res.status(400).json({
      message: "缺少 ocrText",
      sleepHour: null,
      calorie: null
    });
  }
  try {
    const result = await analyzeOcrTextWithDeepseek(String(ocrText).trim());
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      message: err && err.message ? err.message : "AI 分析失败",
      sleepHour: null,
      calorie: null
    });
  }
});

/** 小程序 wx.cloud.callContainer 无法 multipart，走 JSON + base64（与 multipart 共用同一分析逻辑） */
router.post("/ai/analyze-json", async (req, res) => {
  const b64 = req.body && req.body.imageBase64;
  if (!b64) {
    return res.status(400).json({
      message: "缺少 imageBase64",
      sleepHour: null,
      calorie: null
    });
  }
  let buf;
  try {
    buf = Buffer.from(String(b64), "base64");
  } catch (e) {
    return res.status(400).json({
      message: "imageBase64 无效",
      sleepHour: null,
      calorie: null
    });
  }
  if (!buf.length) {
    return res.status(400).json({
      message: "图片数据为空",
      sleepHour: null,
      calorie: null
    });
  }
  const mime = (req.body && req.body.mimeType) || "image/jpeg";
  try {
    const result = await analyzeImageWithDeepseek({
      buffer: buf,
      mimetype: mime
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      message: err && err.message ? err.message : "AI 分析失败",
      sleepHour: null,
      calorie: null
    });
  }
});

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
