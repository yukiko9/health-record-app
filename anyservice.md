wx.cloud.init({
env: 'healthbook-6g0u9wm07f2a2e45',
traceUser: true,
})

const result = await wx.cloud.callContainer({
path: '/api/users', // 后端 API 路径
method: 'POST', // HTTP 方法
header: {
'X-WX-SERVICE': 'tcbanyservice', // 固定值
'X-AnyService-Name': 'my-service', // 您的服务标识
'Content-Type': 'application/json'
},
data: {
name: '张三',
email: 'zhangsan@example.com'
}
// dataType: 'text' // 可选：不要 SDK 自动解析 JSON 时使用
})
