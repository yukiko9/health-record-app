/**
 * 图片文字识别（外接 API）
 *
 * 小程序端对 OCR_EXTRACT_URL 发起 wx.request（需在公众平台配置 request 合法域名）。
 * 约定：POST JSON { imageBase64: string, mimeType: string }
 * 响应 JSON 至少含其一：text | result | data（字符串）
 *
 * 未配置 URL 时：可联调 wx.setStorageSync("MOCK_OCR_TEXT", "你复制的截图文字…")
 */
const OCR_EXTRACT_URL = "";

/** 可选：Bearer Token，勿提交真实密钥到公开仓库 */
const OCR_EXTRACT_TOKEN = "";

module.exports = {
  OCR_EXTRACT_URL,
  OCR_EXTRACT_TOKEN,
};
