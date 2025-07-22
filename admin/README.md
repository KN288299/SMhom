# 家政服务管理系统

## 项目简介

这是一个基于 React + TypeScript + Ant Design 的现代化管理系统，用于管理家政服务聊天应用的用户、消息和对话。

## 技术栈

- **前端框架**: React 18 + TypeScript
- **UI 组件库**: Ant Design 5.x
- **路由管理**: React Router 6
- **状态管理**: React Context API
- **构建工具**: Vite
- **HTTP 客户端**: Axios

## 功能特性

- 🔐 用户认证和授权
- 📊 数据统计仪表盘
- 👥 用户管理
- 💬 消息管理
- 🛡️ 路由保护
- 📱 响应式设计

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 访问系统

打开浏览器访问: http://localhost:3000

## 管理员账号

- **用户名**: kn6969
- **密码**: cjygsg.520
- **角色**: 超级管理员

## 页面说明

### 登录页面 (/login)
- 用户登录入口
- 支持用户名密码登录
- 登录成功后自动跳转到仪表盘

### 仪表盘 (/dashboard)
- 系统概览页面
- 显示统计数据
- 快速操作入口
- 系统信息展示

### 用户管理 (/users)
- 用户列表管理
- 用户状态控制
- 用户信息编辑

### 功能测试 (/test)
- 登录状态检查
- 认证功能验证
- 调试信息展示
- 系统功能测试

## 开发说明

### 项目结构

```
src/
├── api/          # API 接口
├── components/   # 公共组件
├── context/      # React Context
├── pages/        # 页面组件
├── services/     # 服务层
├── styles/       # 样式文件
└── utils/        # 工具函数
```

### 环境变量

确保后端服务器运行在 `http://localhost:5000`，或者修改 `src/api/api.ts` 中的 `baseURL`。

### 构建生产版本

```bash
npm run build
```

## 常见问题

### 1. 登录后返回登录页面
- 检查后端服务器是否正常运行
- 确认数据库连接正常
- 查看浏览器控制台是否有错误信息

### 2. 页面显示异常
- 检查浏览器控制台错误
- 确认所有依赖已正确安装
- 清除浏览器缓存

### 3. API 请求失败
- 确认后端服务器地址正确
- 检查网络连接
- 查看后端服务器日志

## 开发团队

- 前端开发: React + TypeScript
- UI 设计: Ant Design
- 后端支持: Node.js + Express

## 许可证

MIT License 