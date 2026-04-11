const { getOrCreateUser } = require("../services/dataService");

function resolveCloudOpenId(req) {
  const a = req.get("x-wx-openid");
  const b = req.get("x-wx-from-openid");
  if (a != null && String(a).trim() !== "") return String(a).trim();
  if (b != null && String(b).trim() !== "") return String(b).trim();
  return "";
}

function authMiddleware(req, res, next) {
  if (req.method === "OPTIONS") {
    return next();
  }

  let userId = resolveCloudOpenId(req);
  if (!userId) {
    const devFallback =
      process.env.ALLOW_X_USER_ID_DEV === "1" && process.env.NODE_ENV !== "production";
    if (devFallback) {
      const headerId = req.get("x-user-id");
      userId =
        headerId != null && String(headerId).trim() !== ""
          ? String(headerId).trim()
          : "1";
    } else {
      return res.status(401).json({
        message:
          "缺少用户身份：请通过微信小程序云托管 wx.cloud.callContainer 访问，或由网关注入 X-WX-OPENID"
      });
    }
  }

  const user = getOrCreateUser(userId);
  req.user = user;
  next();
}

module.exports = authMiddleware;
