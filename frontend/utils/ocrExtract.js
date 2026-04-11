const { OCR_EXTRACT_URL, OCR_EXTRACT_TOKEN } = require("./ocrConfig");

function guessImageMimeByPath(filePath) {
  const lower = String(filePath).toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

/**
 * 从本地临时图片路径提取文字：优先 MOCK_OCR_TEXT；否则请求 OCR_EXTRACT_URL。
 * @returns {Promise<string>}
 */
function extractTextFromImage(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const mock = wx.getStorageSync("MOCK_OCR_TEXT");
      if (mock != null && String(mock).trim()) {
        resolve(String(mock).trim());
        return;
      }
    } catch (e) {
      /* ignore */
    }

    const url = String(OCR_EXTRACT_URL || "").trim();
    if (!url) {
      resolve("");
      return;
    }

    wx.getFileSystemManager().readFile({
      filePath,
      encoding: "base64",
      success: (r) => {
        const imageBase64 = r.data;
        const mimeType = guessImageMimeByPath(filePath);
        const headers = { "Content-Type": "application/json" };
        if (OCR_EXTRACT_TOKEN && String(OCR_EXTRACT_TOKEN).trim()) {
          headers.Authorization = `Bearer ${String(OCR_EXTRACT_TOKEN).trim()}`;
        }
        wx.request({
          url,
          method: "POST",
          header: headers,
          data: { imageBase64, mimeType },
          success(res) {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error("OCR 服务返回异常"));
              return;
            }
            const d = res.data;
            let text = "";
            if (d && typeof d === "object") {
              if (d.text != null) text = d.text;
              else if (d.result != null) text = d.result;
              else if (d.data != null) text = typeof d.data === "string" ? d.data : "";
            } else if (typeof d === "string") {
              text = d;
            }
            resolve(String(text || "").trim());
          },
          fail(err) {
            reject(err || new Error("OCR 请求失败"));
          },
        });
      },
      fail(err) {
        reject(err || new Error("读取图片失败"));
      },
    });
  });
}

module.exports = {
  extractTextFromImage,
  guessImageMimeByPath,
};
