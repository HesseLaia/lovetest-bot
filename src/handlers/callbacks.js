// src/handlers/callbacks.js
import { InlineKeyboard } from 'grammy';
import { gameLogic } from '../core/gameLogic.js';
import { messageBuilder } from '../messages/builder.js';
import { t } from '../messages/i18n.js';

export function registerCallbacks(bot) {
  // 语言选择回调（callback_data: lang_en / lang_ru）
  bot.callbackQuery(/^lang_(en|ru)$/, async (ctx) => {
    const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
    if (!chatId) return;

    const language = ctx.match[1]; // 'en' 或 'ru'

    await ctx.answerCallbackQuery();

    // 显示难度选择键盘
    const keyboard = new InlineKeyboard()
      .text(t(language, 'difficultyEasy'), `diff_${language}_easy`)
      .text(t(language, 'difficultyMedium'), `diff_${language}_medium`)
      .text(t(language, 'difficultyHard'), `diff_${language}_hard`);

    await ctx.editMessageText(t(language, 'selectDifficulty'), {
      reply_markup: keyboard,
    });
  });

  // 难度选择回调（callback_data: diff_en_easy / diff_ru_medium / diff_en_hard 等）
  bot.callbackQuery(/^diff_(en|ru)_(easy|medium|hard)$/, async (ctx) => {
    const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
    if (!chatId) return;

    const language = ctx.match[1]; // 'en' 或 'ru'
    const difficulty = ctx.match[2]; // 'easy' / 'medium' / 'hard'

    await ctx.answerCallbackQuery();

    // 先弹汤类型键盘，只有用户再点一次汤类型后才触发生成/落库
    const keyboard = new InlineKeyboard()
      .text(t(language, 'soupTypeClear'), `soup_${language}_${difficulty}_clear`)
      .text(t(language, 'soupTypeRed'), `soup_${language}_${difficulty}_red`)
      .text(t(language, 'soupTypeBlack'), `soup_${language}_${difficulty}_black`);

    await ctx.editMessageText(t(language, 'selectSoupType'), {
      reply_markup: keyboard,
    });
  });

  // 汤类型选择回调（callback_data: soup_en_easy_clear 等）
  bot.callbackQuery(/^soup_(en|ru)_(easy|medium|hard)_(clear|red|black)$/, async (ctx) => {
    const chatId = ctx.callbackQuery.message?.chat?.id ?? ctx.chat?.id;
    if (!chatId) return;

    const language = ctx.match[1]; // 'en' 或 'ru'
    const difficulty = ctx.match[2]; // 'easy' / 'medium' / 'hard'
    const soupType = ctx.match[3]; // 'clear' / 'red' / 'black'

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(t(language, 'generating'));

    try {
      const { scenario } = await gameLogic.finalizeGame(chatId, language, difficulty, soupType);
      const message = messageBuilder.buildScenarioMessage(language, scenario);
      await ctx.reply(message);
    } catch (error) {
      if (error.message === 'GAME_IN_PROGRESS') {
        await ctx.reply(t(language, 'gameInProgress'));
      } else if (error.message === 'API_TIMEOUT') {
        await ctx.reply(t(language, 'networkError'));
      } else {
        console.error('Error generating story:', error);
        await ctx.reply(t(language, 'generationFailed'));
      }
    }
  });
}
