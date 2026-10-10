# Muyi Zhu — Personal website

本地静态网站。依据 `personal_website.site` 导出的节点、内容与图片制作，保留黑底白字、城市全景、个人简介、联系侧栏和项目网格，并按作者反馈维护。

## 本地预览

需要 Node.js；网站构建没有第三方 npm 依赖。

```bash
cd /Users/Muyi/Documents/Personal_Materials/Personal_Website/Figma_website
npm run dev
```

打开终端显示的 `http://127.0.0.1:4173`。另一个终端执行 `npm run build` 后刷新即可查看修改。

```bash
npm run build       # 生成 dist/
npm run check       # 检查页面、资源与内部链接
PORT=4174 npm run preview  # 端口被占用时换端口
```

预览服务只绑定本机。也可以直接打开 `dist/index.html` 查看静态页面，但 HTTP 预览更接近发布后的环境。

## 页面与内容

- 首页、Publication、News，加上原稿的 9 个项目详情页，总计 12 页，以及一个 404 页面。
- 首页有 11 个项目卡片。Suicide & Geography 打开原稿中的 StoryMap 链接；Commute Exposure 没有详情页，保留为静态卡片。
- 4 篇论文和 8 条新闻沿用设计文件文字；未添加未经确认的研究经历或结果。
- 页面路径沿用 Figma 的 `/publication/`、`/news/` 和 `/project-…/`。

## 编辑入口

| 内容 | 文件 |
|---|---|
| 姓名、个人介绍、研究方向、联系方式 | `src/content/profile.json` |
| 首页项目标题、年份、封面、链接 | `src/content/projects.json` |
| 项目正文与图片 | `src/content/project-details.json` |
| 论文引用与链接 | `src/content/publications.json` |
| 新闻日期与正文 | `src/content/news.json` |
| 字体、颜色、基础间距 | `src/styles/tokens.css` |
| 分栏、导航、设备断点 | `src/styles/layout.css` |
| 各页样式与首页排版 | `src/styles/pages.css` |
| 图库、返回顶部、淡入效果 | `src/scripts/main.js` |

内容中的 `html`/`bioHtml` 保存正文、加粗、下划线和链接。这些是唯一的正文来源，无需再同步修改一份纯文本副本。段落之间用 `\n` 分隔，各段中的标签需成对闭合。所有内容文件由你维护，构建不会重新导入或覆盖它们。

导航和联系方式由公共模板生成。联系方式只需修改 `profile.json` 的 `contacts` 一次，重建后全部页面同步。所有页面共用 `tokens.css` 中的 `--site-width` 和同一固定顶部导航。

## 资源与设计依据

`public/images/` 保存 52 张实际使用的图片的 WebP 显示版和高清查看版。原稿素材的裁切对应、节点 ID 和资源来源在 `docs/asset-manifest.json`。图片名称采用原名称与短哈希，避免重复覆盖。

`public/fonts/` 是本地 WOFF2 字体和 OFL 许可。网页不依赖 Google Fonts CDN。原始字体备份保留在上级 `Figma_website/docs/font-sources/`；发布仓库使用精简后的 WOFF2 字体。

原始 `.site` 文件和解析数据留在上级目录。`scripts/import-design.py` 是一次性导入脚本，依赖 Pillow；只在明确重新导入设计时运行，因为它会覆盖内容 JSON。正常构建不需要 Python、Pillow 或 Figma 在线权限。

## 已补充的行为

- 大屏内容限宽；桌面三列项目，平板两列，手机两列，窄于 360 px 单列。
- 手机重新安排头像、简介与联系信息；详情页侧栏在小屏移至正文后。
- 图板点击放大、打开高清图、Esc 关闭、焦点返回触发按钮；弹窗只有 Open image 和 Close 两个入口。
- 图片延迟加载和自适应尺寸；固定图片比例减少布局跳动。
- 键盘焦点、跳转正文入口、原生 dialog 焦点限制、减少动态效果偏好。
- 本地字体、页面标题、描述、MZ favicon 与 `.nojekyll`。

## GitHub Pages 发布与维护

正式网址：https://muyi-zhu.github.io/ 。仓库 `muyi-zhu/muyi-zhu.github.io` 使用 `main` 分支根目录发布。

仓库包含完整源码，以及根目录下已生成的 HTML、`assets/`、`images/`、`fonts/` 和 `icons/`。日常修改 `src/` 与 `public/`，不要直接改根目录生成的页面；源码和发布文件一起提交，方便回溯版本。

在 `muyi-zhu.github.io` 仓库内完成以下操作：

```bash
npm run release    # 构建、检查，再将 dist 的发布文件同步到仓库根目录
npm run preview    # 本地查看 dist
# 检查 git diff，提交本次内容，再 git push origin main
```

`npm run release` 不执行 Git 提交或远程上传。`.pages-files.json` 记录生成文件，以便下一次移除过期页面；同步不会删除源码。`dist/` 不提交。Pages 保持 Deploy from a branch → main → /(root)，无需安装 npm 依赖或更改部署服务。

首次替换后，以 `muyi-zhu.github.io/src/` 中的源码作为维护入口。上级 `Figma_website/` 保留本地设计版本，两个目录不是自动双向同步的。

旧版 `publications.html`、`news.html`、`design.html` 和四个设计项目 HTML 地址均跳转到对应新版页面，保留已有外部链接的可用性。网站暂未添加访问统计。

发布到其他带仓库前缀的项目站点时，用 `SITE_BASE_PATH=/仓库名/ npm run build` 配置 404 页的资源根路径，并调整旧链接跳转页中的 canonical。其余页面使用相对链接。

## 验证记录

见 `docs/verification.md`；效果截图在 `docs/previews/`。网站依据设计属性制作，尚未与 Figma 在线渲染做逐像素对比。Figma 的色温滤镜与文字渲染存在浏览器差异；以实际浏览效果为后续调整依据。
