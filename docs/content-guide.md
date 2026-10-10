# 内容更新

1. 编辑 `src/content/` 中的相应 JSON。
2. 新图片放入 `public/images/`；给定准确的原始宽高。
3. 执行 `npm run build`、`npm run check`。
4. 本地刷新并检查桌面和手机布局。

正文只有 `html`（个人简介为 `bioHtml`）这一份来源。普通文字直接编辑，有链接或加粗时保留对应标签。段落之间的 `\n` 会生成段落间距，每一段内的标签应完整闭合。原始 Figma 文字仍保存在上级目录的 `.site` 和 `design-inspection` 中。

联系方式在 `profile.json` 的 `contacts` 数组，所有页面共用。修改邮箱、Scholar、LinkedIn 或 ORCID 后只需重建一次。

给项目卡片设置 `link.route` 会链接到同名详情页；设置 `link.external` 会打开外部链接。留空时仅展示静态卡片，不提供点击操作。

新增详情页时，`route` 使用不含斜杠的英文路径，例如 `project-new-study`；同时在 `project-details.json` 加入对应条目。

新增论文：在 `publications.json` 数组末尾增加一项，序号自动生成。新增新闻：在 `news.json` 数组开头增加日期 `date` 和正文 `html`。

图片 `src` 和 `full` 都是相对于站点根的路径，例如 `images/project.webp`。`full` 用于放大查看，不改变展示图的排版。
