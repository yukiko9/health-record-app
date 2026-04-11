/**
 * 图片文字识别
 *
 * - ocr.space：免费档，演示密钥 helloworld 免注册即可试（有速率/配额限制）；正式使用建议在 https://ocr.space/ocrapi/freekey 领免费 API key。
 *   须在小程序后台配置 request 合法域名：api.ocr.space
 * - json：自建或网关，POST JSON { imageBase64, mimeType }，响应含 text | result | data 之一
 *
 * 联调：wx.setStorageSync("MOCK_OCR_TEXT", "粘贴截图文字…") 可跳过 OCR
 */
/** @type {"ocr.space" | "json" | "none"} */
const OCR_PROVIDER = "ocr.space";

/** 仅 OCR_PROVIDER === "json" 时使用 */
const OCR_EXTRACT_URL = "";

/** 仅 json 模式：Bearer Token，勿把真实密钥提交到公开仓库 */
const OCR_EXTRACT_TOKEN = "";

/** OCR.space 请求头 apikey；默认官方演示 key，生产请换成你的免费 key */
const OCR_SPACE_API_KEY = "helloworld";

/** OCR.space 语言码：简体中文 chs，英文 eng，自动检测（引擎 2/3）用 auto */
const OCR_SPACE_LANGUAGE = "chs";

module.exports = {
  OCR_PROVIDER,
  OCR_EXTRACT_URL,
  OCR_EXTRACT_TOKEN,
  OCR_SPACE_API_KEY,
  OCR_SPACE_LANGUAGE,
};
