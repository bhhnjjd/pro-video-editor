# ProVideoEditor - 专业 Web 视频编辑器

ProVideoEditor 是一个基于 Next.js 和 TypeScript 构建的现代化在线视频编辑器，提供多轨时间线、预览、特效及导出等完整功能。

## 功能特性
- **多轨编辑**：支持无限的视频、音频和文本轨道
- **拖拽界面**：直观的时间线操作，支持网格吸附
- **实时预览**：Canvas 渲染，支持播放控制与缩放
- **丰富效果**：视频滤镜、音频处理以及转场动画
- **导出配置**：自定义分辨率、帧率、比特率及格式

## 快速开始
```bash
npm install
npm run dev
```
打开浏览器访问 [http://localhost:3000](http://localhost:3000)。

## Docker 部署
仓库已包含 `Dockerfile`，可直接构建镜像并运行：
1. 构建镜像
   ```bash
   docker build -t provideoeditor .
   ```
2. 运行容器
   ```bash
   docker run -p 3000:3000 provideoeditor
   ```
启动后在浏览器中访问 `http://localhost:3000` 即可。

## 目录结构
```
src/
├── app/        Next.js 页面
├── components/  主要 React 组件
├── store/       状态管理
├── types/       TypeScript 类型
└── utils/       处理视频与音频的工具
```

## 许可证
MIT
