// 调用 healthbook 云托管服务
const res = await wx.cloud.callContainer({
  config: {
    env: "healthbook-6g0u9wm07f2a2e45" // 与小程序已关联的云开发环境 ID
  },
  path: "/", // 业务自定义路径，根目录为 /
  method: "GET", // 依业务选择
  header: {
    "X-WX-SERVICE": "healthbook" // 云托管服务名称
    // 其他 header
  }
  // dataType: 'text' // 默认为 JSON；如需自行解析可设为 'text'
});

console.log(res);