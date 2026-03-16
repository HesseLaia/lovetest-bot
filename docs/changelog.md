# Changelog

## [1.0.0] - 2026-03-13 - MVP 版本完成

### ✅ 已实现功能

#### 核心游戏功能
- 🎮 `/newgame` 启动游戏，支持英语/俄语双语选择
- 🤖 AI 生成海龟汤场景和汤底（基于 OpenRouter Gemini 2.0 Flash）
- 💬 回复 bot 消息提问，AI 自动判断 是/否/无关
- 🎯 `/guess` 提交完整猜测并查看答案对比
- 📖 `/reveal` 直接查看汤底
- ❌ `/cancel` 取消当前游戏
- ❓ `/help` 显示玩法说明

#### 技术实现
- ✅ grammy bot 框架
- ✅ MySQL 数据库存储游戏状态（连接池模式）
- ✅ OpenRouter API 集成（Gemini 2.0 Flash 001）
- ✅ 英语/俄语双语支持
- ✅ 完整的错误处理和用户提示
- ✅ Railway 部署成功

### 🐛 开发中遇到的问题与解决

#### 1. .gitignore 配置问题导致 .env 泄露
**问题**：项目初始时 `.gitignore` 和 `.env` 同时创建，但 `.gitignore` 未生效，导致 `.env` 文件被 push 到 GitHub，敏感信息（API Key、数据库密码）泄露 2 次。

**解决方案**：
- 删除 GitHub 仓库并重建
- 更换泄露的 API Key
- 确保 `.gitignore` 在添加 `.env` 前生效
- 验证 `git status` 确认 `.env` 未被追踪

**教训**：项目初始化时务必先创建并提交 `.gitignore`，再创建敏感文件。

#### 2. OpenRouter 模型 ID 过期
**问题**：tech design 中使用的模型 ID `google/gemini-2.0-flash-exp` 返回 404 错误。

**解决方案**：
- 查阅 OpenRouter 文档，更新为最新稳定版本 `google/gemini-2.0-flash-001`
- 在 `src/config/env.js` 中支持环境变量 `OPENROUTER_MODEL` 覆盖默认值，方便后续调整

**经验**：AI 模型 ID 经常变动（实验版→稳定版），应支持配置化并及时查阅文档。

#### 3. Task 2.2 测试时 JSON 解析问题
**问题**：AI 生成故事时偶尔返回带 markdown 代码块的 JSON（`` ```json ... ``` ``），导致 `JSON.parse` 失败。

**解决方案**：
- 在 `aiClient.generateStory` 中添加预处理，去除首尾的 markdown 代码块：
  ```javascript
  const jsonStr = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  ```

**经验**：大模型输出格式不稳定，需要容错处理。

#### 4. gameLogic 结束游戏时语言丢失
**问题**：在 `submitGuess` / `revealAnswer` / `cancelGame` 中，如果先调用 `endGame(chatId)` 再查询数据库获取 `language`，会因为游戏已结束（status = 'ended'）而查不到当前游戏，导致无法获取语言做 i18n。

**解决方案**（.cursorrules）：
- 先从 `game` 对象提取需要的字段（`language`、`truth` 等）
- 再调用 `endGame` / `deleteGame`
- 返回提取的数据给上层 handler

**经验**：业务逻辑中要注意数据获取与状态变更的顺序。

### 📊 技术栈

- **Bot 框架**：grammy 1.21.1
- **数据库**：mysql2 3.9.0（连接池，10 个连接）
- **AI API**：OpenRouter (`google/gemini-2.0-flash-001`)
- **HTTP 客户端**：Node.js 内置 fetch
- **部署平台**：Railway
- **Node 版本**：v24.13.0

### 🚀 后续迭代方向

- [ ] 难度选择（简单/中等/困难）
- [ ] 提示系统（`/hint` 命令）
- [ ] 用户数据统计和排行榜
- [ ] 历史游戏记录查询
- [ ] 私聊支持
- [ ] 定时清理 ended 状态的历史数据
- [ ] API 限流和成本控制
- [ ] 日志监控（Sentry 等）
- [ ] 支持更多语言

---

## 开发团队

- **项目名称**：海龟汤 Bot (Lateral Thinking Puzzle Bot)
- **版本**：MVP v1.0
- **完成时间**：2026-03-13
