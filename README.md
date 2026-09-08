# 色彩暗房

> 把色彩理论，变成看得见的调色练习。

「色彩暗房」是一个面向摄影初学者的中文交互式学习工具。它把色彩理论、带任务的练习和浏览器端图像调节放在同一个工作台中，帮助学习者通过观察与实际操作理解后期调色。

## 功能

- 七章循序课程：五章照片调色基础，以及光色混合、颜料与综合色调。
- 内置教学样片、观察重点、常见误区和参数范围任务反馈。
- 支持导入 JPEG、PNG、WebP 图片；照片只在浏览器本机处理，不上传也不保存。
- 原图按住查看、拖动分割对比及一键复位。
- 使用 Web Worker 执行非破坏式像素处理，连续调节时保留最新请求，避免界面回退到过时结果。
- 两章混色教程各含三个预测练习和一个支持 2～3 色的自由调色盘。
- 光色使用线性 sRGB 加色；颜料使用 Spectral.js 的 Kubelka–Munk 光谱近似。
- 学习进度保存于浏览器 LocalStorage：`color-darkroom.progress.v2`，旧 v1 数据会自动迁移。
- 响应式工作台布局，支持键盘可操作的常规控件。

## 图像处理顺序

1. 白平衡（色温、色调）
2. 全局 HSL
3. 分颜色 HSL（六色带软过渡）
4. RGB 曲线（256 项 LUT）
5. 阴影与高光着色

导入图片会在本地解码，并将最长边缩放到 1280 像素以内用于实时预览。

## 技术栈

- React 19 + Vite
- TypeScript
- Tailwind CSS 4 + shadcn/ui
- Web Worker + Canvas ImageData
- Spectral.js 3.0.0
- Vitest
- GitHub Pages + GitHub Actions

## 本地运行

### 环境要求

- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`（与 jsdom 测试依赖一致；CI 使用 22.22.2）
- npm

### 安装与启动

```bash
npm install
npm run dev
```

开发服务器启动后，按终端提示打开本地地址。

### 常用命令

```bash
npm run dev       # 启动开发服务器
npm run typecheck # TypeScript 类型检查
npm run lint      # 运行 oxlint
npm test          # 运行 Vitest 单元测试
npm run build     # 生成生产构建
npm run preview   # 本地预览生产构建
npm run format    # 使用 oxfmt 格式化代码
```

## 项目结构

```text
src/                 标准 React + Vite 应用入口
app/                 全局样式
components/          照片工作台、混色工作台、调节面板、色轮、曲线和 UI 组件
lib/                 课程、v2 进度、照片颜色引擎与混色纯函数
workers/             图像处理 Web Worker
tests/               颜色引擎、混色、进度与 jsdom 组件测试
public/samples/      五章教学样片
.github/workflows/   GitHub Pages 自动部署工作流
```

## 课程内容

| 章节 | 主题 | 练习重点 |
| --- | --- | --- |
| 第一章 | 色相、饱和度、明度 | 区分颜色的三个维度 |
| 第二章 | 白平衡 | 以中性色判断色温和色调 |
| 第三章 | 色彩关系 | 使用色相距离理解互补与邻近色 |
| 第四章 | 分颜色 HSL | 在保留主体自然感的前提下调整局部颜色 |
| 第五章 | RGB 曲线与分离色调 | 先建立明暗层次，再塑造克制的冷暖氛围 |
| 第六章 | RGB 光色混合 | 预测红、绿、蓝光的线性能量叠加结果 |
| 第七章 | 颜料与综合色调 | 比较减色混合以及 tint、tone、shade |

混色章节提供两种模式：

- “预测练习”先隐藏结果，答题后解释原因；每章三题全对才完成。
- “自由调色盘”支持预设色、原生颜色选择器、独立强度或颜料份数，以及可选第三色。自由参数不计分也不保存。

## 数据与隐私

- 用户导入的照片通过浏览器 Blob URL 读取，处理过程仅发生在本机内存中。
- 不包含账户、数据库、云端图片存储或图片上传功能。
- 仅保存课程章节、完成状态和逐题进度；图片、照片调节参数及自由调色盘参数不会持久化。

## 测试

测试文件位于 `tests/`，覆盖照片颜色引擎、RGB 加色、Spectral.js 颜料混色、综合色描述、六道练习、v1→v2 迁移、逐题恢复和混色组件键盘交互。

运行：

```bash
npm test
```

## 已知限制

- 这是 sRGB 浏览器学习预览，不等同于专业 RAW 后期软件或真实颜料打样。
- 首版不支持 RAW、ICC 色彩管理、成片导出、撤销历史或 Lightroom 参数映射。
- 课程任务评分只适用于内置教学样片；导入个人照片时为自由实验模式。

## 部署

项目已配置 GitHub Pages 自动部署。将变更推送到 `main` 分支后，GitHub Actions 会依次安装依赖、执行类型检查和测试、构建 `dist`，再发布到 Pages。仓库首次部署前，请在 GitHub 的 Pages 设置中选择 **GitHub Actions** 作为来源。

Vite 的部署基路径固定为 `/Color-darkroom/`，本地开发地址通常为 `http://localhost:5173/Color-darkroom/`。

## 许可

本项目的教学内容与实现用于摄影色彩学习。Spectral.js 3.0.0 依 MIT 许可证使用，完整归属与许可文本见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
