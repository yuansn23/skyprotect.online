# 素材工坊 · AI 图片素材生成

输入一句提示词，一键生成高清图片素材。基于 `gpt-image-2.5-sunburst`，部署在 Cloudflare Pages。

## 功能

- 提示词生成图片，支持 **方形 1:1 / 竖版 2:3 / 横版 3:2** 三种比例
- 生成时带 **等待动效**：旋转光环 + 状态文案轮播 + 进度条
- 生成后支持 **下载 PNG / 复制提示词 / 重新生成**
- 示例提示词一键填入，`Ctrl/⌘ + Enter` 快捷生成
- 会话内历史记录（刷新后清空）

## 架构

```
┌─ 浏览器 ─────────────────────────┐
│  public/index.html + app.js      │   用户输入提示词 → 前端调用 /api/generate
└──────────────┬───────────────────┘
               │ 同源请求（无跨域）
┌──────────────▼───────────────────┐
│  Cloudflare Pages Function       │   functions/api/generate.js
│  读取 env.TEAMOROUTER_API_KEY    │   服务端代理，隐藏密钥
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│  api.teamorouter.com/v1          │   gpt-image-2.5-sunburst
└──────────────────────────────────┘
```

API Key 只存在于 Cloudflare 服务端环境变量中，**不进入前端、不提交到 Git 仓库**。

## 目录结构

```
.
├── functions/
│   └── api/generate.js    # Pages Function：服务端代理
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── wrangler.toml
├── .dev.vars              # 本地密钥（已 gitignore）
└── .dev.vars.example
```

## 本地开发

```bash
npm install
npm run dev          # 等价于 wrangler pages dev public
```

打开终端输出的本地地址（默认 http://localhost:8788）即可。密钥从 `.dev.vars` 读取，无需额外配置。

## 发布到 GitHub + Cloudflare Pages

### 1. 推送到 GitHub

```bash
cd 9-20img-shengc
git init
git add .
git commit -m "feat: AI 图片素材生成工具"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

> `.dev.vars` 已被 `.gitignore` 忽略，密钥不会被提交。

### 2. Cloudflare Pages 连接 GitHub

1. 打开 Cloudflare 控制台 → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. 选择刚创建的 GitHub 仓库
3. 构建设置：
   - **Framework preset**：`None`
   - **Build command**：留空
   - **Build output directory**：`public`
4. 点击 **Save and Deploy**

### 3. 配置密钥环境变量（关键步骤）

部署完成后：

1. 进入项目 → **Settings** → **Environment variables** → **Production**
2. 添加变量：
   - 变量名：`TEAMOROUTER_API_KEY`
   - 值：`sk-teamo-...`（你的 teamorouter 密钥）
3. 保存后，重新触发一次部署（Deployments → Retry deployment）使变量生效

### 4. 验证

打开分配的 `*.pages.dev` 域名，输入提示词生成一张图片。如果成功，即部署完成。

> 也可以绑定你自己的自定义域名。

## 常见问题

- **生成失败 / 服务端未配置 TEAMOROUTER_API_KEY**：说明环境变量没配或没重新部署，回到第 3 步。
- **无法连接图片服务**：上游 API 暂时不可达，稍后重试。
- **想要更多尺寸/模型/张数**：修改 `functions/api/generate.js` 里的 `size` 白名单和 `model` 字段即可。
