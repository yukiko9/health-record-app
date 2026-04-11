# 构建上下文为整个 UI 目录；容器内仅启动 backend 的 Node 服务。
FROM node:20-alpine

WORKDIR /app

# 将整个项目放入镜像（含 frontend 等），便于与仓库布局一致地部署。
COPY . .

WORKDIR /app/backend

RUN npm ci --omit=dev

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
