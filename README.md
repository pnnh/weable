一个部署在Cloudflare Worker上的图片管理应用

## 环境变量

复制 `.env.local.example` 为 `.env.local` 并填入以下值：

| 变量 | 说明 |
|------|------|
| `CALIEO_CLIENT_ID` | 从 [Calieo 控制台](https://portal.calieo.xyz) 注册应用后获取 |
| `CALIEO_CLIENT_SECRET` | 同上；生产环境通过 `wrangler secret put CALIEO_CLIENT_SECRET` 注入 |
| `BASE_URL` | 可选；用于构建 OAuth2 回调 URL，开发环境默认 `http://localhost:7600` |

Calieo 控制台需注册回调 URL：
- 开发：`http://localhost:7600/api/auth/callback/calieo`
- 生产：`https://<your-domain>/api/auth/callback/calieo`
