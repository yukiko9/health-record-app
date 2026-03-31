# health-app backend

本目录是微信小程序 `frontend` 对应的后端实现。

## 1) 运行方式

```bash
cd backend
npm install
npm run dev
```

默认端口：`3000`（可通过 `PORT` 环境变量覆盖）。

## 2) API 总览

- `GET /api/dashboard`
- `GET /api/records/recent?limit=20`
- `GET /api/records/high-rate?limit=2`
- `GET /api/records/week-progress`
- `POST /api/records/act`
- `POST /api/records/eating`
- `POST /api/records/sleep`
- `POST /api/goal/save`
- `POST /api/ai/analyze`（multipart，字段名 `image`）

## 3) Vercel 部署

本项目已经包含 `backend/vercel.json` 与 `backend/api/index.js`，可直接作为 Vercel Node 函数部署。

### 你只需要在 Vercel 填写 DeepSeek Key

在 Vercel 项目中配置环境变量：

- `DEEPSEEK_API_KEY`（必填）
- `DEEPSEEK_BASE_URL`（可选，默认 `https://api.deepseek.com`）
- `DEEPSEEK_MODEL`（可选，默认 `deepseek-chat`）

后端代码不会把 Key 写入前端，也不会从请求体读取 Key。

## 4) 提示词放置位置（已标注）

请编辑：

- `backend/src/services/deepseek.js`

在该文件中找到常量：

- `SYSTEM_PROMPT`

此处已经有明显注释：

`在这里放置/修改 AI 提示词（后端专用，不要放到前端）`

你可以直接替换 `SYSTEM_PROMPT` 字符串为你的最终提示词模板。

## 5) 用户维度

当前后端通过请求头 `x-user-id` 做简单用户隔离；未传时默认 `1`。

## 6) 存储说明

- 本地开发：数据写入 `backend/data/db.json`
- Vercel：函数环境文件系统为临时存储，实例重启后数据可能丢失；生产建议改造为外部数据库
