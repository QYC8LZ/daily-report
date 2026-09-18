# Daily Brief

一个面向每日 10 分钟阅读预算的静态简报站点。

## 数据结构

- `briefs/index.json`：历史简报索引
- `briefs/YYYY-MM-DD.json`：每日简报正文
- `index.html` / `styles.css` / `app.js`：静态阅读器

## 发布

仓库包含 GitHub Pages Actions 工作流。启用 Pages 并将 Source 设置为 **GitHub Actions** 后，每次推送到 `main` 都会自动发布。

## 每日报告原则

- 8–11 条正文，常规 2000–2300 中文字
- 30 秒摘要
- 市场 / 科技 / 游戏与硬件 / 全球大事
- 一手信息源优先，重大争议信息尽量交叉验证
- Hacker News 主要用于发现线索，事实回到原始链接核实
- 不使用低质量聚合站、内容农场或 SMZDM 作为事实来源
