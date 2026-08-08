# Design QA — Codex 风格整体布局

- Source of truth: `C:\Users\luhao\AppData\Local\Temp\codex-clipboard-5e854651-b819-4678-8bf3-a3631ea9db47.png`
- Implementation capture: `D:\Project\Rust\TroveKit\implementation-codex-layout.png`
- Side-by-side comparison: `D:\Project\Rust\TroveKit\design-qa-comparison.png`
- Reference pixels: 2562 × 1450（按比例归一到 2048 × 1159 后比较）
- Browser viewport / implementation pixels: 2048 × 1159，density factor 1
- State: light theme、首页、左侧栏展开、编码工具与哈希加密分组展开

## Full-view comparison

已在同一张对照图中检查参考图与实现：全局浅灰桌面框架、顶部菜单栏、约 18.65% 宽的左侧栏、右侧白色圆角工作区、双层标题结构、边框/阴影/排版密度均与参考布局语言一致。

## Focused regions

- 顶栏：菜单、搜索入口、窗口控制区域在同一水平节奏内。
- 侧栏：品牌区、首页选中态、可展开工具分组、底部操作区层级清晰。
- 内容区：去除原有页面内大卡片外壳，以连续白色工作区承载内容。

## Interaction checks

- 左侧分组可独立展开与收起。
- 点击子工具可直接进入对应功能，功能页不再出现顶部 tablist。
- 顶部侧栏按钮可切换侧栏显隐。
- Ctrl/Cmd + K 与搜索按钮均保留命令菜单入口。

## Comparison history

1. 首轮发现浏览器预览中 Tauri 窗口 API 导致空白页；增加运行时保护。
2. 首轮交互发现当前分组会被副作用立即强制展开；移除强制回弹逻辑。
3. 最终复测布局、工具导航、分组折叠与侧栏显隐。

## Final result

passed
