# Muyi Zhu — Personal website

个人学术网站，依据 Figma 设计制作。正式网址：[muyi-zhu.github.io](https://muyi-zhu.github.io/)。

本仓库是唯一的源码维护入口。上级 `Figma_website/` 保留为设计参考，不自动同步。日常只修改源码与资源；构建结果统一输出到 `dist/`，由 GitHub Actions 发布。

## 文件组织

```text
muyi-zhu.github.io/
├── .github/workflows/pages.yml   # 构建检查与 GitHub Pages 发布
├── src/
│   ├── content/                 # 简介、论文、新闻、项目数据
│   ├── templates/               # 页面模板及公共导航、侧栏、页脚
│   ├── styles/                  # 字体、配色、间距与响应式样式
│   └── scripts/                 # 浏览器交互
├── public/
│   ├── images/                  # 图片展示版与高清版
│   ├── fonts/                   # 本地 WOFF2 字体和授权文件
│   ├── icons/                   # favicon
│   └── …                        # 旧版地址的跳转页面
├── scripts/                     # 构建、校验、预览与设计导入工具
├── docs/                        # 内容维护、部署和设计说明
├── dist/                        # 自动生成，不提交 Git
├── .nvmrc                       # Node.js 版本
├── .editorconfig                # 编码、换行和缩进约定
├── .gitignore
├── package.json
└── README.md
```

`public/` 中的文件会原样复制到 `dist/`；页面 HTML 由 `src/content/` 和 `src/templates/` 生成。根目录不存放生成页面或重复图片。`dist/`、预览截图、缓存与 Finder 元数据均不提交。

## 本地预览

使用 Node.js 24 或更新版本；使用 nvm 时可执行 `nvm use`。项目没有第三方 npm 依赖，无需执行 `npm install`。

在本仓库目录运行：

```bash
npm run dev           # 构建并启动 http://127.0.0.1:4173
npm run build         # 修改后重新生成 dist，再刷新浏览器
npm run check         # 检查富文本、内部链接、资源与发布目录
npm run release       # 构建并检查；输出仍在 dist，不上传
PORT=4175 npm run preview  # 默认端口被占用时
```

预览只绑定本机。构建不会自动重新导入设计，也不会覆盖你编辑的内容文件。

## 日常修改

| 内容 | 编辑位置 |
|---|---|
| 姓名、简介、研究方向、所有页面的联系方式 | `src/content/profile.json` |
| 首页项目卡片、封面、年份及链接 | `src/content/projects.json` |
| 项目详情正文、标题、图片 | `src/content/project-details.json` |
| 论文引用及链接 | `src/content/publications.json` |
| 新闻日期和正文 | `src/content/news.json` |
| 字体、颜色和基础间距 | `src/styles/tokens.css` |
| 分栏、导航和设备断点 | `src/styles/layout.css` |
| 页面布局 | `src/styles/pages.css` |
| 图片查看器和动效 | `src/scripts/main.js` |

编辑后运行 `npm run release`，再用 `npm run preview` 检查桌面和手机布局。提交本次源码修改并推送 main 后，GitHub 自动构建、校验和发布。无需手动复制 HTML 或上传 dist。

导航、联系方式、页脚来自公共模板。联系方式在 profile.json 修改一次，所有页面重建后同步。正文使用 `html`/`bioHtml`，用 `\n` 分隔段落，保留成对的标签。

新增论文、新闻、项目和图片的具体步骤见 [内容维护指南](docs/content-guide.md)。

## 首次发布设置

请先在 GitHub 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，再推送本版本。之后无需重复设置。

工作流只发布 dist。main 的推送和手动运行可以部署；Pull Request 只构建检查，失败的检查会阻止本次部署。正式网址和现有页面路径保持不变。

首次切换、GitHub Desktop 操作和排错步骤见 [部署指南](docs/deployment.md)。

## 设计与资源

网站包含首页、Publication、News 和 9 个项目详情页，以及 404 与 7 个旧地址跳转页。Commute Exposure 保留为静态卡片；网站暂未添加访问统计。

public/images 包含 52 张设计素材的展示版和高清 WebP；来源见 [资源清单](docs/asset-manifest.json)。字体本地加载，OFL 许可随字体保存。原始 .site、解析数据和原始字体备份留在仓库外的设计参考目录。

`scripts/import-design.py` 是一次性导入工具，需要外部设计文件和 Pillow，会覆盖内容 JSON。仅在明确重新导入时使用；正常维护与 GitHub 构建不依赖 Python 或 Figma 在线权限。

响应式布局、公共导航、图片查看器与动效均沿用已确认的版本。检查范围见 [验证记录](docs/verification.md)。
