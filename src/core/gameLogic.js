// src/core/gameLogic.js
import { gameRepo } from '../db/gameRepo.js';
import { aiClient } from './aiClient.js';

export const gameLogic = {
  /**
   * 启动新游戏
   */
  async startGame(chatId, language, difficulty = 'medium', soupType = 'clear') {
    try {
      const { scenario, truth } = await aiClient.generateStory(language, difficulty);
      await gameRepo.create(chatId, language, difficulty, soupType, scenario, truth);

      return { scenario, truth };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('GAME_IN_PROGRESS');
      }
      throw error;
    }
  },

  /**
   * 处理提问
   */
  async handleQuestion(chatId, question) {
    const game = await gameRepo.getCurrentGame(chatId);
    if (!game) {
      throw new Error('NO_GAME');
    }

    const answer = await aiClient.judgeQuestion(
      game.scenario,
      game.truth,
      question,
      game.language
    );

    await gameRepo.incrementQuestions(chatId);

    return { answer, game };
  },

  /**
   * 提交猜测并结束游戏
   */
  async submitGuess(chatId, guess) {
    const game = await gameRepo.getCurrentGame(chatId);
    if (!game) {
      throw new Error('NO_GAME');
    }

    const result = {
      guess,
      truth: game.truth,
      language: game.language,
      questionsCount: game.questions_count,
    };

    await gameRepo.endGame(chatId);

    return result;
  },

  /**
   * 直接查看答案
   */
  async revealAnswer(chatId) {
    const game = await gameRepo.getCurrentGame(chatId);
    if (!game) {
      throw new Error('NO_GAME');
    }

    const result = {
      truth: game.truth,
      language: game.language,
      questionsCount: game.questions_count,
    };

    await gameRepo.endGame(chatId);

    return result;
  },

  /**
   * 取消游戏
   */
  async cancelGame(chatId) {
    const game = await gameRepo.getCurrentGame(chatId);
    if (!game) {
      throw new Error('NO_GAME');
    }

    const language = game.language;

    await gameRepo.deleteGame(chatId);

    return { language };
  },

  /**
   * 获取方向性提示（最多 3 次，成功才递增 hint_count）
   */
  async getHint(chatId) {
    const game = await gameRepo.getCurrentGame(chatId);
    if (!game) {
      throw new Error('NO_GAME');
    }

    const hintCount = Number(game.hint_count ?? 0);
    if (hintCount >= 3) {
      return { language: game.language, exhausted: true };
    }

    try {
      const hint = await aiClient.generateHint(game.scenario, game.questions_count, game.language);
      await gameRepo.incrementHints(chatId);
      return { language: game.language, exhausted: false, hint };
    } catch (error) {
      // 失败/超时不递增 hint_count，允许用户立刻重试
      return { language: game.language, exhausted: false, hintError: error.message || 'UNKNOWN' };
    }
  },
};
