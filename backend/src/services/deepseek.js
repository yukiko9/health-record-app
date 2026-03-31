const axios = require("axios");
const config = require("../config");

/**
 * 在这里放置/修改 AI 提示词（后端专用，不要放到前端）。
 * 建议仅通过 Vercel 环境变量管理 DEEPSEEK_API_KEY。
 */
const SYSTEM_PROMPT = `
现在你是一个用于自动识别并获取、打印用户健康数据的机器人。
你会收到一张健康应用主界面的截图，请识别并提取：
1) 睡眠时间（单位：小时，可小数）
2) 热量（单位：卡路里）

请严格以 JSON 输出，字段如下：
{"sleepHour": number|null, "calorie": number|null}

如果无法识别某字段，请返回 null，不要返回文字解释。
`.trim();

function extractJsonObject(text) {
  if (!text) return null;
  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch (err) {
    // continue
  }
  const match = direct.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (err) {
    return null;
  }
}

async function analyzeImageWithDeepseek(file) {
  if (!config.deepseekApiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY 未配置。请在 Vercel 项目环境变量中设置 DEEPSEEK_API_KEY。"
    );
  }
  if (!file || !file.buffer) {
    throw new Error("未收到有效图片文件");
  }

  const mimeType = file.mimetype || "image/png";
  const base64 = file.buffer.toString("base64");
  const imageDataUrl = `data:${mimeType};base64,${base64}`;

  const url = `${config.deepseekBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const payload = {
    model: config.deepseekModel,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: [
          { type: "text", text: "请识别截图中的 sleepHour 与 calorie，并仅返回 JSON。" },
          { type: "image_url", image_url: { url: imageDataUrl } }
        ]
      }
    ]
  };

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${config.deepseekApiKey}`,
      "Content-Type": "application/json"
    },
    timeout: 30000
  });

  const content = res.data &&
    res.data.choices &&
    res.data.choices[0] &&
    res.data.choices[0].message
    ? res.data.choices[0].message.content
    : "";

  const parsed = extractJsonObject(content) || {};
  const sleepHour = parsed.sleepHour == null ? null : Number(parsed.sleepHour);
  const calorie = parsed.calorie == null ? null : Number(parsed.calorie);

  return {
    sleepHour: Number.isFinite(sleepHour) ? sleepHour : null,
    calorie: Number.isFinite(calorie) ? calorie : null
  };
}

module.exports = {
  SYSTEM_PROMPT,
  analyzeImageWithDeepseek
};
