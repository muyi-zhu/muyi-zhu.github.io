# GitHub Pages 部署

正式仓库：`muyi-zhu/muyi-zhu.github.io`。正式网址：https://muyi-zhu.github.io/ 。

## 一次性切换

1. 在 GitHub 仓库打开 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**，保存（如果界面提供 Save）。完成此设置后再推送新结构，避免旧的根目录发布方式读取没有 index.html 的源码目录。
3. 在 GitHub Desktop 选择本地 `muyi-zhu.github.io` 仓库和 `main` 分支，点击 **Push origin**。
4. 在仓库 **Actions** 查看 **Build and deploy website**。`build` 和 `deploy` 均成功后，查看正式网址。

后续只需修改、预览、提交和推送；Pages 的 Source 无需重复设置。GitHub Pages 的自定义工作流说明见 [GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 工作流行为

- Node.js 版本由 `.nvmrc` 指定。当前没有 npm 依赖，不执行安装步骤。
- `build` 执行 `npm run build` 和 `npm run check`。
- 只有通过检查的 `main` 版本会上传 `dist/` 并执行部署。
- Pull Request 执行相同构建和检查，不发布。
- `deploy` 使用 GitHub 的 `github-pages` environment 和 Pages 授权，不需要在仓库保存个人访问令牌。
- 正在执行的部署会完成；新的部署按工作流并发规则排队。
- 可在 Actions 中选择工作流，点击 **Run workflow**，使用 `main` 手动重新部署。

源码、说明文档、原始设计与本地缓存不会作为发布 artifact 上传。`public/` 是网站的静态资源入口，请仅在其中放置打算公开的网站文件。

## 修改后发布

1. 编辑 `src/` 和 `public/`。
2. 运行 `npm run release`，再执行 `npm run preview` 检查效果。
3. 在 GitHub Desktop 查看 Changes，填写说明并 **Commit to main**。
4. 点击 **Push origin**，查看 Actions 状态。

命令行用户也可以有选择地执行 `git add`、`git commit`、`git push origin main`。不提交 `dist/`，不手动修改生成的 HTML。

## 发布失败时

- **build 失败**：先在本地运行 `npm run release`，根据错误修复 JSON、富文本标签或资源路径。仅通过构建的内容可进入部署。
- **deploy 失败或提示 Pages 未启用**：确认 Pages 的 Source 为 GitHub Actions，Actions 没有被仓库设置禁用，`github-pages` environment 允许 `main` 部署。查看失败步骤的具体日志。
- **远程没有更新**：检查 GitHub Desktop 是否仍显示 Push origin，以及远程 main 是否包含本次提交。
- **Actions 成功但浏览器显示旧内容**：核对成功的工作流对应最新提交，然后强制刷新。部署完成与浏览器缓存更新可能存在短暂间隔。

需要回退某次日常内容修改时，可在 GitHub Desktop 的 History 中对该源码提交使用 **Revert changes in commit**，然后推送，让工作流重新构建。首次迁移以前的旧站结构不使用这套工作流，回退跨越迁移边界时需同时核对部署配置。
