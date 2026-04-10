小程序的服务标识：healthbook
初始化代码：wx.cloud.init({
    env: 'healthbook-6g0u9wm07f2a2e45',
    traceUser: true,
})

服务调用
在小程序中调用
1. 初始化云开发环境
在小程序加载阶段调用一次初始化，全局执行一次即可：

// app.js - 全局初始化
App({
  async onLaunch() {
    // 初始化云开发环境
    wx.cloud.init({
      env: "your-env-id" // 替换为您的环境 ID
    })
  }
})

2. 调用 AnyService 服务
使用 wx.cloud.callContainer 方法调用 AnyService 服务：

// 调用示例
const callAnyService = async () => {
  try {
    const res = await wx.cloud.callContainer({
      path: '/api/users',           // 后端 API 路径
      method: 'POST',             // HTTP 方法
      header: {
        "X-WX-SERVICE": "tcbanyservice",     // 固定值
        "X-AnyService-Name": "my-service",   // 您的服务标识
        "Content-Type": "application/json"
      },
      data: {
        name: '张三',
        email: 'zhangsan@example.com'
      }
      // dataType: 'text'  // 可选：不要 SDK 自动解析 JSON 时使用
    })
    
    console.log('调用成功:', res.data)
    return res.data
  } catch (error) {
    console.error('调用失败:', error)
    throw error
  }
}

关键参数说明
参数	值	说明
X-WX-SERVICE	tcbanyservice	固定值，标识调用 AnyService
X-AnyService-Name	您的服务标识	创建服务时设置的标识符
path	/api/path	后端 API 路径，从根目录开始
method	GET/POST/PUT/DELETE	HTTP 请求方法
dataType	json（默认）/text	响应数据解析方式
错误处理与最佳实践
常见错误处理

const callAnyService = async (path, data = {}) => {
  try {
    const res = await wx.cloud.callContainer({
      path,
      method: 'POST',
      header: {
        "X-WX-SERVICE": "tcbanyservice",
        "X-AnyService-Name": "my-service",
        "Content-Type": "application/json"
      },
      data,
      timeout: 10000 // 设置超时时间
    })
    
    return res.data
  } catch (error) {
    // 处理不同类型的错误
    if (error.errCode === -1) {
      console.error('网络请求失败:', error.errMsg)
      wx.showToast({ title: '网络连接失败', icon: 'none' })
    } else if (error.errCode === 40001) {
      console.error('服务未找到:', error.errMsg)
      wx.showToast({ title: '服务暂不可用', icon: 'none' })
    } else {
      console.error('调用失败:', error)
      wx.showToast({ title: '请求失败，请重试', icon: 'none' })
    }
    throw error
  }
}

最佳实践建议

请求封装：建议将 AnyService 调用封装成通用函数
错误处理：为不同错误类型提供相应的用户提示
超时设置：为网络请求设置合理的超时时间
状态管理：在调用过程中显示加载状态
重试机制：对于临时性错误可以实现重试逻辑
📝 提示：其他参数均与 wx.request 保持一致。

请求与响应数据
请求 Header
通过 SDK 调用服务时，系统会自动在 HTTP Header 中携带小程序相关信息，后端可以通过解析这些 Header 获取用户和环境信息：

Header 字段	含义	说明
X-WX-OPENID	小程序用户 openid	用户唯一标识
X-WX-APPID	小程序 AppID	小程序应用标识
X-WX-UNIONID	小程序用户 unionid	跨应用用户标识（需满足获取条件）
X-WX-FROM-OPENID	资源复用场景下的用户 openid	资源复用时的原始用户标识
X-WX-FROM-APPID	资源复用场景下的小程序 AppID	资源复用时的原始应用标识
X-WX-FROM-UNIONID	资源复用场景下的用户 unionid	资源复用时的原始用户跨应用标识
X-WX-ENV	云环境 ID	当前调用所在的云开发环境
X-WX-SOURCE	调用来源	触发本次调用的来源类型
X-WX-PLATFORM	调用平台	发起调用的平台信息
X-Forwarded-For	客户端 IP 地址	支持 IPv4 和 IPv6
X-AnyService-Name	AnyService 服务标识	当前调用的服务标识符
响应 Header
AnyService 会在响应中添加以下 Header 字段，用于调试和监控：

Header 字段	含义	说明
X-Cloudbase-Request-Id	云开发请求 ID	用于问题追踪和日志查询
X-Cloudbase-Upstream-Status-Code	源站响应状态码	后端服务实际返回的 HTTP 状态码
X-Cloudbase-Upstream-Timecost	源站响应耗时	后端服务处理请求的时间（毫秒）
X-Cloudbase-Upstream-Type	源站服务类型	后端服务的类型标识