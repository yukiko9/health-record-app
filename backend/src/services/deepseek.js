const axios = require("axios");
const config = require("../config");

/**
 * 在这里放置/修改 AI 提示词（后端专用，不要放到前端）。
 * 建议仅通过 Vercel 环境变量管理 DEEPSEEK_API_KEY。
 */
const SYSTEM_PROMPT = `
现在你是一个用于自动识别并获取、打印用户健康数据的机器人。这是一个健康应用的主界面截图识别出来的文字，请你识别睡眠时间（单位为小时）和热量（单位为卡路里），以json格式输出（下面** **里的内容都必须完全是数字形式）：{"sleepHour": **你获取到的睡眠时长数据**, "calorie": **你获取到的卡路里消耗量，转换单位为千卡**}未获取到数据的属性值直接改为undefined，不要返回解释性文字。

`.trim();

/** OCR 文本模式：由前端/外接 OCR 提供纯文本，不再传图 */
const SYSTEM_PROMPT_OCR_TEXT = `
现在你是一个用于自动识别并获取、打印用户健康数据的机器人。这是一个健康应用的主界面截图识别出来的文字，请你识别睡眠时间（单位为小时）和热量（单位为卡路里），以json格式输出（下面** **里的内容都必须完全是数字形式）：{"sleepHour": **你获取到的睡眠时长数据**, "calorie": **你获取到的卡路里消耗量，转换单位为千卡**}未获取到数据的属性值直接改为undefined，不要返回解释性文字。
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
      "DEEPSEEK_API_KEY 未配置。请在 Vercel 项目环境变量中设置 DEEPSEEK_API_KEY。",
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
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "请识别截图中的 sleepHour 与 calorie，并仅返回 JSON。",
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  };

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${config.deepseekApiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  const content =
    res.data &&
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
    calorie: Number.isFinite(calorie) ? calorie : null,
  };
}

async function analyzeOcrTextWithDeepseek(ocrText) {
  if (!config.deepseekApiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY 未配置。请在 Vercel 项目环境变量中设置 DEEPSEEK_API_KEY。",
    );
  }
  const text = String(ocrText || "").trim();
  if (!text) {
    throw new Error("ocrText 为空");
  }

  const url = `${config.deepseekBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const payload = {
    model: config.deepseekModel,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT_OCR_TEXT,
      },
      {
        role: "user",
        content: `以下为 OCR 文本，请提取 sleepHour 与 calorie，并仅输出 JSON：\n\n${text}`,
      },
    ],
  };

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${config.deepseekApiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  const content =
    res.data &&
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
    calorie: Number.isFinite(calorie) ? calorie : null,
  };
}

module.exports = {
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_OCR_TEXT,
  analyzeImageWithDeepseek,
  analyzeOcrTextWithDeepseek,
};
