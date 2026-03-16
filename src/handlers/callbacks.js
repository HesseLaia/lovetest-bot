// src/handlers/callbacks.js
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
    await ctx.editMessageText(t(language, 'generating'));

    try {
      const { scenario } = await gameLogic.startGame(chatId, language);
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
