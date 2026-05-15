# portal-weight-management

云端同步的家庭体重记录、BMI 和趋势报表应用。

## 技术栈

- Bun + Vite 8 + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui 风格组件
- TanStack Router + TanStack Query
- Supabase Auth + Postgres + RLS
- Recharts + Vitest

## 开发

```bash
bun install
cp .env.example .env.local
bun run dev
```

没有配置 Supabase 环境变量时，应用会使用内置演示数据，方便先查看界面和交互。

## Supabase

1. 创建 Supabase 项目。
2. 在 `.env.local` 填入 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
3. 在 Supabase SQL editor 或 CLI 中执行 `supabase/migrations/20260515000000_initial_schema.sql`。
4. 开启邮箱验证码登录。

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
- `VITE_SUPABASE_URL`（可选；不填则使用演示数据）
- `VITE_SUPABASE_ANON_KEY`（可选；不填则使用演示数据）

如果要换域名，修改 `deployment.yaml` 里的 `weight.tt829.cn`。
