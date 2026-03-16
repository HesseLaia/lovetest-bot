// src/db/pool.js
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

// 创建连接池
export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// 测试连接
export async function testConnection() {
  const conn = await pool.getConnection();
  console.log('✅ 数据库连接成功');
  conn.release();
}

// 初始化数据库表
export async function initDatabase() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS games (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chat_id BIGINT NOT NULL UNIQUE,
      language VARCHAR(2) NOT NULL COMMENT 'en 或 ru',
      difficulty VARCHAR(10) NOT NULL COMMENT 'easy / medium / hard',
      scenario LONGTEXT NOT NULL COMMENT '场景描述',
      truth LONGTEXT NOT NULL COMMENT '完整故事/汤底',
      questions_count INT DEFAULT 0 COMMENT '提问次数',
      status VARCHAR(20) NOT NULL COMMENT 'playing 或 ended',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ended_at TIMESTAMP NULL,
      INDEX idx_chat_id (chat_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.execute(createTableSQL);
  console.log('✅ 数据库表初始化完成');
}
