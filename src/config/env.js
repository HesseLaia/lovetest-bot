export const config = {
  // Telegram Bot
  BOT_TOKEN: process.env.BOT_TOKEN,

  // MySQL 数据库
  DB_HOST: process.env.DB_HOST, // 必须用公网地址，不用 mysql.railway.internal
  DB_PORT: process.env.DB_PORT || 3306,
  DB_NAME: process.env.DB_NAME || 'railway',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD,

  // OpenRouter API
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',

  // 可选配置
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// 启动时验证必需环境变量
export function validateConfig() {
  const required = [
    'BOT_TOKEN',
    'DB_HOST',
    'DB_PASSWORD',
    'OPENROUTER_API_KEY',
  ];

  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`);
  }
}

