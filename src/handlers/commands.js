// src/handlers/commands.js
import { gameLogic } from '../core/gameLogic.js';
import { gameRepo } from '../db/gameRepo.js';
import { messageBuilder } from '../messages/builder.js';
import { t } from '../messages/i18n.js';
import { InlineKeyboard } from 'grammy';

export function registerCommands(bot) {
  // /newgame - 启动游戏
  bot.command('newgame', async (ctx) => {
    const chatId = ctx.chat.id;

    try {
      const existingGame = await gameRepo.getCurrentGame(chatId);
      if (existingGame) {
        await ctx.reply(t(existingGame.language || 'en', 'gameInProgress'));
        return;
      }

      const keyboard = new InlineKeyboard()
        .text('English', 'lang_en')
        .text('Русский', 'lang_ru');

      await ctx.reply(t('en', 'selectLanguage'), {
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error('Error in /newgame:', error);
      await ctx.reply(t('en', 'unknownError'));
    }
  });

  // /guess - 提交猜测
  bot.command('guess', async (ctx) => {
    const chatId = ctx.chat.id;
    const guess = ctx.message.text.replace(/\/guess\s*/i, '').trim();

    try {
      const game = await gameRepo.getCurrentGame(chatId);

      if (!game) {
        await ctx.reply(t('en', 'noGame'));
        return;
      }

      if (!guess) {
        await ctx.reply(t(game.language, 'guessEmpty'));
        return;
      }

      const result = await gameLogic.submitGuess(chatId, guess);

      const message = messageBuilder.buildGuessResultMessage(
        result.language,
        result.guess,
        result.truth
      );
      await ctx.reply(message);
    } catch (error) {
      console.error('Error in /guess:', error);
      await ctx.reply(t('en', 'unknownError'));
    }
  });

  // /reveal - 查看答案
  bot.command('reveal', async (ctx) => {
    const chatId = ctx.chat.id;

    try {
      const result = await gameLogic.revealAnswer(chatId);

      const message = messageBuilder.buildRevealMessage(result.language, result.truth);
      await ctx.reply(message);
    } catch (error) {
      if (error.message === 'NO_GAME') {
        await ctx.reply(t('en', 'noGame'));
      } else {
        console.error('Error in /reveal:', error);
        await ctx.reply(t('en', 'unknownError'));
      }
    }
  });

  // /hint - 获取方向性提示（最多 3 次，成功才递增 hint_count）
  bot.command('hint', async (ctx) => {
    const chatId = ctx.chat.id;

    try {
      const result = await gameLogic.getHint(chatId);

      if (result.exhausted) {
        await ctx.reply(t(result.language, 'hintUsedUp'));
        return;
      }

      if (result.hint) {
        await ctx.reply(messageBuilder.buildHintMessage(result.language, result.hint));
        return;
      }

      if (result.hintError === 'API_TIMEOUT') {
        await ctx.reply(t(result.language, 'networkError'));
        return;
      }

      await ctx.reply(t(result.language, 'unknownError'));
    } catch (error) {
      if (error.message === 'NO_GAME') {
        await ctx.reply(t('en', 'noGame'));
      } else {
        console.error('Error in /hint:', error);
        await ctx.reply(t('en', 'unknownError'));
      }
    }
  });

  // /cancel - 取消游戏
  bot.command('cancel', async (ctx) => {
    const chatId = ctx.chat.id;

    try {
      const result = await gameLogic.cancelGame(chatId);

      const message = messageBuilder.buildCancelMessage(result.language);
      await ctx.reply(message);
    } catch (error) {
      if (error.message === 'NO_GAME') {
        await ctx.reply(t('en', 'noGame'));
      } else {
        console.error('Error in /cancel:', error);
        await ctx.reply(t('en', 'unknownError'));
      }
    }
  });

  // /help - 帮助
  bot.command('help', async (ctx) => {
    await ctx.reply(t('en', 'helpText'), { parse_mode: 'Markdown' });
  });
}
