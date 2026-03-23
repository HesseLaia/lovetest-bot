// src/messages/i18n.js
export const messages = {
  en: {
    selectLanguage: '🌍 Please select a language:',
    generating: '⏳ Generating story...',
    gameStarted: '🎮 Game started! Here\'s your scenario:\n\n',
    askHint: '\n\n💡 Reply to this message to ask yes/no questions',

    // 难度选择
    selectDifficulty: '🎯 Select difficulty:',
    difficultyEasy: '🟢 Easy',
    difficultyMedium: '🟡 Medium',
    difficultyHard: '🔴 Hard',
    difficultyEasyDesc: 'Simple logic, 5-10 questions',
    difficultyMediumDesc: '1-2 twists, 10-20 questions',
    difficultyHardDesc: 'Multi-layered, dark themes, 20+ questions',

    // 汤类型选择
    selectSoupType: '🍲 Select soup type:',
    soupTypeClear: '🍵 Clear Soup',
    soupTypeRed: '🔴 Red Soup',
    soupTypeBlack: '⚫ Black Soup',

    answerYes: '✅ Yes',
    answerNo: '❌ No',
    answerIrrelevant: '🤷 Irrelevant',

    gameEnded: '🎯 Game ended!\n\n',
    yourGuess: '【Your Guess】\n',
    theTruth: '\n【The Truth】\n',
    revealed: '📖 The Truth Revealed\n\n',
    completeStory: '【Complete Story】\n',
    gameCancelled: '❌ Game cancelled',
    startNewGame: '\n\n🎮 Use /newgame to start a new game',

    gameInProgress: '⚠️ Game in progress. Please end it first with /reveal, /guess, or /cancel',
    noGame: '⚠️ No active game. Use /newgame to start',
    guessEmpty: '⚠️ Please write your guess after /guess command',
    generationFailed: '❌ Story generation failed. Please try /newgame again',
    networkError: '⏳ Network timeout. Please try again later',
    unknownError: '❌ An error occurred. Please try again',

    helpText: `🎮 **Lateral Thinking Puzzle (Situation Puzzle)**

**How to Play:**
1. Use /newgame to start
2. Bot shows a mysterious scenario
3. Ask yes/no questions by replying to bot's messages
4. Deduce the complete story
5. Submit your guess with /guess or reveal answer with /reveal

**Commands:**
/newgame - Start a new game
/guess <your guess> - Submit your guess
/reveal - Show the answer
/cancel - Cancel current game
/help - Show this help

Good luck! 🍀`,
  },

  ru: {
    selectLanguage: '🌍 Пожалуйста, выберите язык:',
    generating: '⏳ Генерация истории...',
    gameStarted: '🎮 Игра началась! Вот ваш сценарий:\n\n',
    askHint: '\n\n💡 Ответьте на это сообщение, чтобы задать вопросы да/нет',

    // Выбор сложности
    selectDifficulty: '🎯 Выберите сложность:',
    difficultyEasy: '🟢 Легко',
    difficultyMedium: '🟡 Средне',
    difficultyHard: '🔴 Сложно',
    difficultyEasyDesc: 'Простая логика, 5-10 вопросов',
    difficultyMediumDesc: '1-2 поворота, 10-20 вопросов',
    difficultyHardDesc: 'Многослойный, темные темы, 20+ вопросов',

    // Выбор типа супа
    selectSoupType: '🍲 Выберите тип супа:',
    soupTypeClear: '🍵 Светлый суп',
    soupTypeRed: '🔴 Красный суп',
    soupTypeBlack: '⚫ Чёрный суп',

    answerYes: '✅ Да',
    answerNo: '❌ Нет',
    answerIrrelevant: '🤷 Не имеет значения',

    gameEnded: '🎯 Игра окончена!\n\n',
    yourGuess: '【Ваша догадка】\n',
    theTruth: '\n【Истина】\n',
    revealed: '📖 Истина раскрыта\n\n',
    completeStory: '【Полная история】\n',
    gameCancelled: '❌ Игра отменена',
    startNewGame: '\n\n🎮 Используйте /newgame, чтобы начать новую игру',

    gameInProgress: '⚠️ Игра в процессе. Сначала завершите её с помощью /reveal, /guess или /cancel',
    noGame: '⚠️ Нет активной игры. Используйте /newgame для начала',
    guessEmpty: '⚠️ Пожалуйста, напишите вашу догадку после команды /guess',
    generationFailed: '❌ Не удалось создать историю. Попробуйте /newgame снова',
    networkError: '⏳ Тайм-аут сети. Попробуйте позже',
    unknownError: '❌ Произошла ошибка. Попробуйте снова',

    helpText: `🎮 **Загадка на логику (Головоломка ситуации)**

**Как играть:**
1. Используйте /newgame для начала
2. Бот показывает загадочный сценарий
3. Задавайте вопросы да/нет, отвечая на сообщения бота
4. Выведите полную историю
5. Отправьте свою догадку с /guess или покажите ответ с /reveal

**Команды:**
/newgame - Начать новую игру
/guess <ваша догадка> - Отправить вашу догадку
/reveal - Показать ответ
/cancel - Отменить текущую игру
/help - Показать эту справку

Удачи! 🍀`,
  },
};

/**
 * 获取消息文本。缺失语言或 key 时回退到英语，再缺失则返回 key 本身。
 */
export function t(language, key) {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}
