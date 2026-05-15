# portal-weight-management

云端同步的家庭体重记录、BMI 和趋势报表应用。

## 技术栈

- Bun + Vite 8 + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui 风格组件
- TanStack Router + TanStack Query
- 后端同步 + JWT Cookie 登录态
- Recharts + Vitest

## 开发

```bash
bun install
cp .env.example .env.local
bun run dev
```

登录后应用会从后端同步真实体重记录；未登录时只显示登录引导。

## 后端

后端使用同级项目 `server-console` 提供的接口。开发时可在 `.env.local` 中配置：

```bash
VITE_API_BASE_URL=https://api.tt829.cn
```

当前已接入：

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/user/login/info`
- `GET /api/weight/records/all`
- `POST /api/weight/record/add`

## 常用命令

```bash
bun run lint
bun run test
bun run build
```

## 部署

项目支持和 `pwa-home` 一样的 GitHub Actions + 腾讯云 TCR + Kubernetes 自动部署。

推送到 `main` 后会自动构建 Docker 镜像、推送到腾讯云 TCR、应用 `deployment.yaml`，并通过 Ingress 暴露到：

```text
https://weight.tt829.cn
```

需要在 GitHub Secrets 中配置：

- `TCR_USERNAME`
- `TCR_PASSWORD`
- `KUBECONFIG`

可选 GitHub Variables：

- `VITE_API_BASE_URL`

如果要换域名，修改 `deployment.yaml` 里的 `weight.tt829.cn`。

Docker 构建同样使用 Bun：

```bash
bun install --frozen-lockfile
bun run build
```
