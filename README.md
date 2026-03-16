# 海龟汤 Bot (Lateral Thinking Puzzle Bot)

一个基于 AI 的 Telegram 群组游戏 Bot，通过提问是/否问题推理出完整故事。

[![Node.js](https://img.shields.io/badge/Node.js-≥18-green)](https://nodejs.org/)
[![grammy](https://img.shields.io/badge/grammy-1.21.1-blue)](https://grammy.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🎮 游戏玩法

海龟汤（Lateral Thinking Puzzle / Situation Puzzle）是一种推理游戏：

1. **Bot 给出诡异场景**：例如"一个男人走进酒吧点了杯水，服务员拿枪指着他，男人说谢谢后离开"
2. **玩家提问**：只能问是/否问题，Bot 会回答 ✅ 是 / ❌ 否 / 🤷 无关
3. **推理真相**：通过多轮提问逐步还原完整故事
4. **提交答案**：用 `/guess` 提交你的猜测，Bot 会显示你的猜测和正确答案的对比

**核心特点**：
- 🤖 AI 生成无限题库（每次游戏都是全新故事）
- 🌍 支持英语和俄语
- 👥 群组协作推理（多人同时提问）
- 🎯 即开即玩，无需注册

## 🚀 快速开始

### 使用已部署的 Bot

1. 在 Telegram 中搜索 `@你的bot用户名`
2. 将 bot 添加到群组
3. 发送 `/newgame` 开始游戏

### 命令列表

| 命令 | 说明 |
|------|------|
| `/newgame` | 启动新游戏，选择语言 |
| `/guess <你的猜测>` | 提交完整猜测并结束游戏 |
| `/reveal` | 直接查看答案 |
| `/cancel` | 取消当前游戏 |
| `/help` | 显示帮助信息 |

### 游戏流程示例

```
用户: /newgame
Bot: 🌍 Please select a language: [English] [Русский]

用户: [点击 English]
Bot: 🎮 Game started! Here's your scenario:

     A man lies dead in a field. Beside him is an unopened package. 
     How did he die?
     
     💡 Reply to this message to ask yes/no questions

用户: [回复] Was he alone?
Bot: ✅ Yes

用户: [回复] Is the package important?
Bot: ✅ Yes

用户: /guess The package was his parachute that failed to open
Bot: 🎯 Game ended!
     
     【Your Guess】
     The package was his parachute that failed to open
     
     【The Truth】
     The man was a skydiver. He packed his own parachute, but it 
     malfunctioned and didn't open...
```

## 🛠️ 本地开发

### 环境要求

- Node.js >= 18
- MySQL 数据库
- OpenRouter API Key

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/你的用户名/lovetest_bot.git
cd lovetest_bot
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

复制 `.env.example` 为 `.env` 并填入你的配置：

```bash
# Telegram Bot
BOT_TOKEN=你的_bot_token

# MySQL 数据库
DB_HOST=数据库地址
DB_PORT=3306
DB_NAME=railway
DB_USER=root
DB_PASSWORD=数据库密码

# OpenRouter API
OPENROUTER_API_KEY=你的_openrouter_api_key

# 可选：指定模型（默认 google/gemini-2.0-flash-001）
OPENROUTER_MODEL=google/gemini-2.0-flash-001
```

4. **启动 Bot**

```bash
# 本地开发（需要确保 Railway 上的 bot 已停止）
npm run dev

# 或使用 --env-file 加载 .env（Node 20+）
node --env-file=.env bot.js
```

### 注意事项

⚠️ **重要**：本地开发时**必须停止 Railway 上的 bot 实例**，否则会冲突（409 Conflict）。

检查本地 node 进程（Windows）：
```powershell
Get-Process node | ForEach-Object { (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine }
```

## 📦 部署到 Railway

1. 连接 GitHub 仓库到 Railway
2. 添加 MySQL 数据库服务
3. 设置环境变量（见上方配置说明，DB_HOST 使用公网地址）
4. Railway 会自动检测 `npm start` 并部署
5. 查看日志确认启动成功

## 📁 项目结构

```
lovetest_bot/
├── bot.js                    # 主入口文件
├── package.json
├── .env.example              # 环境变量模板
├── .gitignore
├── CLAUDE.md                 # 开发规则
├── .cursorrules              # 项目专用约定
├── docs/
│   ├── prd.md                # 产品需求文档
│   ├── tech_design.md        # 技术设计文档
│   ├── task.md               # 任务拆解
│   └── changelog.md          # 更新日志
└── src/
    ├── config/
    │   └── env.js            # 环境变量配置
    ├── db/
    │   ├── pool.js           # MySQL 连接池
    │   └── gameRepo.js       # 游戏数据操作
    ├── core/
    │   ├── aiClient.js       # OpenRouter API 封装
    │   └── gameLogic.js      # 游戏核心逻辑
    ├── handlers/
    │   ├── commands.js       # 命令处理
    │   ├── callbacks.js      # 回调处理
    │   └── messages.js       # 消息处理
    └── messages/
        ├── i18n.js           # 多语言支持
        └── builder.js        # 消息构建器
```

## 🔧 技术栈

- **Bot 框架**：[grammy](https://grammy.dev/) - 现代化的 Telegram Bot 框架
- **数据库**：MySQL + [mysql2](https://github.com/sidorares/node-mysql2)（连接池模式）
- **AI API**：[OpenRouter](https://openrouter.ai/)（Gemini 2.0 Flash 001）
- **部署**：[Railway](https://railway.app/)
- **Node 版本**：>= 18

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

开发前请阅读：
- [`CLAUDE.md`](CLAUDE.md) - 通用开发规则
- [`docs/tech_design.md`](docs/tech_design.md) - 技术设计文档

## 📝 后续计划

- [ ] 难度选择（简单/中等/困难）
- [ ] 提示系统（`/hint` 命令）
- [ ] 用户统计和排行榜
- [ ] 历史游戏记录
- [ ] 私聊模式
- [ ] 更多语言支持
- [ ] API 限流和成本优化

详见 [changelog.md](docs/changelog.md)

## 📄 许可证

MIT License

## 🙏 致谢

- [grammy](https://grammy.dev/) - 优秀的 Telegram Bot 框架
- [OpenRouter](https://openrouter.ai/) - 统一的 AI API 接口
- [Railway](https://railway.app/) - 简单易用的部署平台

---

**Have fun! 🎮🍀**
