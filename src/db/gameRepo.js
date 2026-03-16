// src/db/gameRepo.js
import { pool } from './pool.js';

export const gameRepo = {
  /**
   * 创建新游戏
   * @param {number} chatId
   * @param {string} language - 'en' | 'ru'
   * @param {string} [difficulty='medium'] - 'easy' | 'medium' | 'hard'
   * @param {string} scenario
   * @param {string} truth
   */
  async create(chatId, language, difficulty = 'medium', scenario, truth) {
    const [result] = await pool.execute(
      `INSERT INTO games (chat_id, language, difficulty, scenario, truth, status)
       VALUES (?, ?, ?, ?, ?, 'playing')`,
      [chatId, language, difficulty, scenario, truth]
    );
    return result.insertId;
  },

  /**
   * 获取当前游戏（by chat_id）
   */
  async getCurrentGame(chatId) {
    const [rows] = await pool.execute(
      `SELECT * FROM games WHERE chat_id = ? AND status = 'playing' LIMIT 1`,
      [chatId]
    );
    return rows[0] || null;
  },

  /**
   * 增加提问次数
   */
  async incrementQuestions(chatId) {
    await pool.execute(
      `UPDATE games SET questions_count = questions_count + 1
       WHERE chat_id = ? AND status = 'playing'`,
      [chatId]
    );
  },

  /**
   * 结束游戏
   */
  async endGame(chatId) {
    await pool.execute(
      `DELETE FROM games WHERE chat_id = ? AND status = 'playing'`,
      [chatId]
    );
  },

  /**
   * 删除游戏（用于 /cancel）
   */
  async deleteGame(chatId) {
    await pool.execute(
      `DELETE FROM games WHERE chat_id = ? AND status = 'playing'`,
      [chatId]
    );
  },
};
