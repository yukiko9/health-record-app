const {
  OCR_PROVIDER,
  OCR_EXTRACT_URL,
  OCR_EXTRACT_TOKEN,
  OCR_SPACE_API_KEY,
  OCR_SPACE_LANGUAGE,
} = require("./ocrConfig");

const OCR_SPACE_URL = "https://api.ocr.space/parse/image";

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

    const provider = String(OCR_PROVIDER || "none").toLowerCase();
    if (provider === "none") {
      resolve("");
      return;
    }

    if (provider === "ocr.space") {
      const apikey = String(OCR_SPACE_API_KEY || "helloworld").trim() || "helloworld";
      wx.uploadFile({
        url: OCR_SPACE_URL,
        filePath,
        name: "file",
        header: { apikey },
        formData: {
          language: String(OCR_SPACE_LANGUAGE || "chs").trim() || "chs",
          isOverlayRequired: "false",
          detectOrientation: "true",
        },
        success(res) {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`OCR 服务 HTTP ${res.statusCode}`));
            return;
          }
          let d = res.data;
          if (typeof d === "string") {
            try {
              d = JSON.parse(d);
            } catch (e) {
              reject(new Error("OCR 返回非 JSON"));
              return;
            }
          }
          if (d && d.IsErroredOnProcessing && d.ErrorMessage) {
            reject(new Error(String(d.ErrorMessage)));
            return;
          }
          const parts = (d && d.ParsedResults) || [];
          const chunks = [];
          for (let i = 0; i < parts.length; i += 1) {
            const pr = parts[i];
            if (pr && pr.ParsedText) chunks.push(String(pr.ParsedText));
            else if (pr && pr.ErrorMessage)
              chunks.push(`[页${i + 1}] ${pr.ErrorMessage}`);
          }
          resolve(chunks.join("\n").trim());
        },
        fail(err) {
          reject(err || new Error("OCR 上传失败"));
        },
      });
      return;
    }

    if (provider !== "json") {
      resolve("");
      return;
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
