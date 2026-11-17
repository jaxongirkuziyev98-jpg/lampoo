import type { AppLanguage, GameId, LessonDepth } from '../types/lesson';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  shortLabel: string;
  bcp47: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'uz', label: "O'zbekcha", shortLabel: "O'zb", bcp47: 'uz-UZ' },
  { code: 'ru', label: 'Русский', shortLabel: 'Рус', bcp47: 'ru-RU' },
  { code: 'en', label: 'English', shortLabel: 'Eng', bcp47: 'en-US' },
  { code: 'tr', label: 'Türkçe', shortLabel: 'Tür', bcp47: 'tr-TR' },
];

export interface UiCopy {
  subtitle: string;
  modeLesson: string;
  modeChat: string;
  modeGames: string;
  heroTitle: string;
  heroLoadingTitle: string;
  heroSubtitle: string;
  heroLoadingSubtitle: string;
  placeholder: string;
  followUpPlaceholder: string;
  internet: string;
  footerNote: string;
  writtenPanelTitle: string;
  summaryTitle: string;
  formulaTitle: string;
  lectureFlowTitle: string;
  takeawaysTitle: string;
  sourcesTitle: string;
  writingNowLabel: string;
  continuousModeLabel: string;
  loadingMoreLabel: string;
  continueDeeperLabel: string;
  historyTitle: string;
  historySubtitle: string;
  historyEmptyTitle: string;
  historyEmptySubtitle: string;
  notesButton: string;
  hideNotesButton: string;
  enableAudioLabel: string;
  micStartTitle: string;
  micStopTitle: string;
  micListening: string;
  micTranscribing: string;
  micPermissionError: string;
  micEmptyError: string;
  depths: Record<LessonDepth, string>;
  suggestions: [string, string, string, string];
  chatWelcome: string;
  chatPlaceholder: string;
  chatTapHint: string;
  chatQuickActions: {
    tickle: string;
    tease: string;
    joke: string;
    praise: string;
    ticklePrompt: string;
    teasePrompt: string;
    jokePrompt: string;
    praisePrompt: string;
  };
  pokeQuips: [string, string, string, string, string];
  playSuggestedGame: string;
  liveStartBtn: string;
  liveStopBtn: string;
  liveListening: string;
  liveThinking: string;
  liveSpeaking: string;
  liveReadyHint: string;
  liveReconnectLine: string;
  gamesTitle: string;
  gamesSubtitle: string;
  gameTitles: Record<GameId, string>;
  gameDescriptions: Record<GameId, string>;
  gameBack: string;
  gameYou: string;
  gameLampo: string;
  gameReset: string;
  rpsChoices: { rock: string; paper: string; scissors: string };
  rpsWelcome: string;
  rpsWin: string;
  rpsLose: string;
  rpsDraw: string;
  mathWelcome: string;
  mathStreak: string;
  mathCheck: string;
  mathNext: string;
  mathPlaceholder: string;
  mathCorrect: string;
  mathWrong: string;
  guessWelcome: string;
  guessPlaceholder: string;
  guessButton: string;
  guessHigher: string;
  guessLower: string;
  guessHot: string;
  guessWon: string;
  guessAttempts: string;
  riddleWelcome: string;
  riddleHintBtn: string;
  riddleNewBtn: string;
  riddlePlaceholder: string;
  riddleCheckBtn: string;
  riddleCorrect: string;
  riddleWrong: string;
  riddleReveal: string;
}

export const UI_COPY: Record<AppLanguage, UiCopy> = {
  uz: {
    subtitle: 'Shaxsiy ustozingiz',
    modeLesson: 'Dars',
    modeChat: 'Suhbat',
    modeGames: "O'yinlar",
    heroTitle: "Nimani o'rganamiz?",
    heroLoadingTitle: 'Lampo dars tayyorlamoqda...',
    heroSubtitle: 'Chizib, yozib va ovoz chiqarib batafsil tushuntiraman.',
    heroLoadingSubtitle: 'Doskaga chizmalar, yozma matn va ovozli maʼruza tuzilmoqda.',
    placeholder: 'Mavzu, savol yoki uy vazifasi...',
    followUpPlaceholder: 'Davom eting yoki yangi savol bering...',
    internet: 'Internet',
    footerNote: "Istalgan fan, suhbat yoki o'yinni tanlang",
    writtenPanelTitle: 'Yozma tushuntirish',
    summaryTitle: 'Mavzu mazmuni',
    formulaTitle: 'Asosiy qoida yoki formula',
    lectureFlowTitle: 'Maʼruza matni',
    takeawaysTitle: 'Asosiy xulosalar',
    sourcesTitle: 'Foydalanilgan manbalar',
    writingNowLabel: 'Yozilmoqda...',
    continuousModeLabel: 'Uzluksiz dars',
    loadingMoreLabel: 'Keyingi qism tayyorlanmoqda...',
    continueDeeperLabel: 'Chuqurroq davom etish',
    historyTitle: 'Darslar tarixi',
    historySubtitle: "Oldin o'tilgan mavzularni qayta ko'ring",
    historyEmptyTitle: "Hali saqlangan darslar yo'q",
    historyEmptySubtitle: 'Istalgan savol bering — Lampo chizib, yozib va gapirib tushuntiradi.',
    notesButton: 'Yozma matn',
    hideNotesButton: 'Matnni yopish',
    enableAudioLabel: 'Ovozni yoqish',
    micStartTitle: 'Ovoz bilan gapirish',
    micStopTitle: "Yozishni to'xtatish",
    micListening: 'Eshitmoqdaman... Gapiravering',
    micTranscribing: 'Ovoz matnga aylantirilmoqda...',
    micPermissionError: 'Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.',
    micEmptyError: "Ovoz eshitilmadi. Qaytadan gapirib ko'ring.",
    depths: {
      qisqa: 'Qisqa (5–10 daq)',
      batafsil: 'Batafsil (20–30 daq)',
      chuqur: "To'liq dars (30–60 daq)",
    },
    suggestions: [
      'Pifagor teoremasi qanday ishlaydi?',
      "O'simliklar qanday oziqlanadi?",
      'Nega osmon moviy?',
      "y = x² grafigi qanday ko'rinadi?",
    ],
    chatWelcome: "Haha, salom do'stim! Xo'sh, bugun kayfiyat qalay, hazillashamizmi?",
    chatPlaceholder: "Lampo bilan xuddi do'stingizdek gaplashing...",
    chatTapHint: 'Lamponi bosib qitiqlab yoki jig‘iga tegib ko‘ring',
    chatQuickActions: {
      tickle: 'Qitiqlash',
      tease: "Jig'iga tegish",
      joke: 'Hazil ayt',
      praise: "Maqtash",
      ticklePrompt: 'Seni qitiqlab qo‘ysam-chi, Lampo?',
      teasePrompt: 'Lampo, sening dumaloq boshingdan boshqa hech narsang yo‘q-ku!',
      jokePrompt: 'Menga bitta zo‘r kulgili hazil aytib ber!',
      praisePrompt: 'Lampo, sen eng aqlli va eng zo‘r do‘stsan!',
    },
    pokeQuips: [
      'Hey! Qitiqlama, kulib yuboraman hozir!',
      'Voy-voy, yana tegding-ku! Qiziq bo‘lyaptimi?',
      'Eee, to‘xta! Boshim aylanib ketyapti-ku!',
      'Bo‘ldi-da endi! Hozir chindan asabimga tegyapsan-a!',
      'Bo‘ldi, xafa bo‘ldim... Kechirim so‘ramasang gapirmayman!',
    ],
    playSuggestedGame: "O'yinni boshlash",
    liveStartBtn: 'Jonli suhbatni boshlash',
    liveStopBtn: "Suhbatni to'xtatish",
    liveListening: 'Eshitmoqdaman... Bemalol gapiring',
    liveThinking: 'Bir soniya...',
    liveSpeaking: 'Lampo gapirmoqda...',
    liveReadyHint: "Bosing va xuddi do'stingizdek jonli gaplashing",
    liveReconnectLine: "Uzr do'stim, bir zum chalg'ib qoldim — yana aytib ko'r-chi?",
    gamesTitle: "Lampo bilan o'yinlar",
    gamesSubtitle: "O'ynaymiz! Yutsang maqtayman, yutqazsam xafa bo'laman-a!",
    gameTitles: {
      rps: 'Tosh · Qaychi · Qog‘oz',
      math: 'Tez Hisob Dueli',
      guess: 'Sonni Top!',
      riddle: 'Topishmoq',
    },
    gameDescriptions: {
      rps: 'Kim zo‘r? Lampo bilan 5 raundlik jang!',
      math: 'Tezlikka misollar yechib Lamponi hayron qoldir!',
      guess: 'Lampo 1 dan 50 gacha son o‘yladi — topib ko‘r!',
      riddle: 'Lamponing aqlli topishmoqlariga javob top!',
    },
    gameBack: "Barcha o'yinlar",
    gameYou: 'Siz',
    gameLampo: 'Lampo',
    gameReset: 'Qayta boshlash',
    rpsChoices: { rock: 'Tosh', paper: 'Qog‘oz', scissors: 'Qaychi' },
    rpsWelcome: 'Qani boshladik! Tosh, qaychi yoki qog‘ozni tanla — yengishga tayyorman!',
    rpsWin: 'Voy-bo‘! Meni yutib qo‘yding-ku! Omading chopdi bugun!',
    rpsLose: 'Ha-ha! Bu safar men yutdim! Yana urinib ko‘r-chi!',
    rpsDraw: 'O‘xshash fikrladik! Durrang — qayta tashlaymiz!',
    mathWelcome: 'Tayyormisan? Misolni tez va to‘g‘ri yech!',
    mathStreak: 'Ketma-ketlik',
    mathCheck: 'Tekshirish',
    mathNext: 'Keyingi misol',
    mathPlaceholder: 'Javobingiz...',
    mathCorrect: 'Barakalla! Chaqmoqdek tez javob berding!',
    mathWrong: "O‘xshamadi-ku! To‘g‘ri javob:",
    guessWelcome: 'Men 1 dan 50 gacha bir son o‘yladim. Qani, topib ko‘r-chi!',
    guessPlaceholder: '1–50 son...',
    guessButton: 'Sinab ko‘rish',
    guessHigher: 'Kattaroq son ayt! Yuqoriga chiq!',
    guessLower: 'Juda ko‘p bo‘lib ketdi! Pastroq tush!',
    guessHot: 'Voy, juda yaqinlashding! Issiq-issiq!',
    guessWon: 'Ana xolos! Xuddi o‘sha sonni topding! Qoyil!',
    guessAttempts: 'Urinishlar',
    riddleWelcome: 'Qani bosh qotiramiz! Mana senga yangi topishmoq:',
    riddleHintBtn: 'Yordam ber',
    riddleNewBtn: 'Yangi topishmoq',
    riddlePlaceholder: 'Javobni yozing...',
    riddleCheckBtn: 'Topdim!',
    riddleCorrect: 'Zo‘r! Topishmoqni bir zumda topding!',
    riddleWrong: 'Sal boshqacha o‘ylab ko‘r-chi, hali topilmadi!',
    riddleReveal: "To'g'ri javob:",
  },
  ru: {
    subtitle: 'Ваш личный учитель',
    modeLesson: 'Урок',
    modeChat: 'Общение',
    modeGames: 'Игры',
    heroTitle: 'Что будем изучать?',
    heroLoadingTitle: 'Лампо готовит урок...',
    heroSubtitle: 'Подробно объясню рисуя, письменно и вслух.',
    heroLoadingSubtitle: 'Готовятся схемы на доске, письменный разбор и озвучка.',
    placeholder: 'Тема, вопрос или домашнее задание...',
    followUpPlaceholder: 'Задайте уточняющий или новый вопрос...',
    internet: 'Интернет',
    footerNote: 'Выберите урок, живое общение или игру с Лампо',
    writtenPanelTitle: 'Письменное объяснение',
    summaryTitle: 'О чём эта тема',
    formulaTitle: 'Главное правило или формула',
    lectureFlowTitle: 'Текст лекции',
    takeawaysTitle: 'Основные выводы',
    sourcesTitle: 'Использованные источники',
    writingNowLabel: 'Пишется...',
    continuousModeLabel: 'Непрерывный урок',
    loadingMoreLabel: 'Готовится продолжение...',
    continueDeeperLabel: 'Продолжить глубже',
    historyTitle: 'История уроков',
    historySubtitle: 'Вернитесь к прошлым темам',
    historyEmptyTitle: 'Сохранённых уроков пока нет',
    historyEmptySubtitle: 'Задайте любой вопрос — Лампо нарисует, напишет и озвучит.',
    notesButton: 'Конспект',
    hideNotesButton: 'Скрыть текст',
    enableAudioLabel: 'Включить звук',
    micStartTitle: 'Говорить голосом',
    micStopTitle: 'Остановить запись',
    micListening: 'Слушаю... Говорите',
    micTranscribing: 'Распознаю речь...',
    micPermissionError: 'Нет доступа к микрофону. Разрешите доступ в настройках браузера.',
    micEmptyError: 'Речь не распознана. Попробуйте сказать ещё раз.',
    depths: {
      qisqa: 'Кратко (5–10 мин)',
      batafsil: 'Подробно (20–30 мин)',
      chuqur: 'Полный урок (30–60 мин)',
    },
    suggestions: [
      'Как работает теорема Пифагора?',
      'Как питаются растения?',
      'Почему небо голубое?',
      'Как выглядит график y = x²?',
    ],
    chatWelcome: 'Ха-ха, привет друг! Ну что, поболтаем и пошутим?',
    chatPlaceholder: 'Поговорите с Лампо как с живым другом...',
    chatTapHint: 'Нажмите на Лампо, чтобы пощекотать или поддразнить его',
    chatQuickActions: {
      tickle: 'Пощекотать',
      tease: 'Поддразнить',
      joke: 'Шутка',
      praise: 'Похвалить',
      ticklePrompt: 'Щекочу тебя, Лампо!',
      teasePrompt: 'Лампо, да ты же просто круглый шарик!',
      jokePrompt: 'Расскажи какую-нибудь смешную шутку!',
      praisePrompt: 'Лампо, ты самый крутой и весёлый друг!',
    },
    pokeQuips: [
      'Эй! Не щекочи, мне смешно!',
      'Ой, опять тыкаешь? Ну-ка перестань!',
      'Хватит, у меня голова кружится!',
      'Серьёзно?! Сейчас точно разозлюсь!',
      'Всё, я обиделся... Пока не похвалишь, не помирюсь!',
    ],
    playSuggestedGame: 'Сыграть сейчас',
    liveStartBtn: 'Начать живой разговор',
    liveStopBtn: 'Завершить разговор',
    liveListening: 'Слушаю... Говорите свободно',
    liveThinking: 'Секундочку...',
    liveSpeaking: 'Лампо говорит...',
    liveReadyHint: 'Нажмите и общайтесь вживую как с другом',
    liveReconnectLine: 'Ой, на секунду отвлёкся — повтори ещё раз, друг!',
    gamesTitle: 'Игры с Лампо',
    gamesSubtitle: 'Сыграем! Выиграешь — похвалю, проиграю — буду дуться!',
    gameTitles: {
      rps: 'Камень · Ножницы · Бумага',
      math: 'Быстрый счёт',
      guess: 'Угадай число!',
      riddle: 'Загадки',
    },
    gameDescriptions: {
      rps: 'Кто кого? Битва с Лампо!',
      math: 'Решай примеры на скорость!',
      guess: 'Лампо загадал число от 1 до 50!',
      riddle: 'Отгадай хитрые загадки Лампо!',
    },
    gameBack: 'Все игры',
    gameYou: 'Вы',
    gameLampo: 'Лампо',
    gameReset: 'Заново',
    rpsChoices: { rock: 'Камень', paper: 'Бумага', scissors: 'Ножницы' },
    rpsWelcome: 'Погнали! Выбирай камень, ножницы или бумагу!',
    rpsWin: 'Ого! Ты меня обыграл! Ну ничего, я ещё отыграюсь!',
    rpsLose: 'Ха-ха! Победа за мной! Попробуй ещё раз!',
    rpsDraw: 'Ничья! Мы думаем одинаково!',
    mathWelcome: 'Готов? Решай пример как можно быстрее!',
    mathStreak: 'Серия',
    mathCheck: 'Проверить',
    mathNext: 'Следующий',
    mathPlaceholder: 'Ваш ответ...',
    mathCorrect: 'Молниеносно и точно! Браво!',
    mathWrong: 'Мимо! Правильный ответ:',
    guessWelcome: 'Я загадал число от 1 до 50. Попробуй угадать!',
    guessPlaceholder: 'Число 1–50...',
    guessButton: 'Проверить',
    guessHigher: 'Бери больше! Выше!',
    guessLower: 'Перебор! Чуть меньше!',
    guessHot: 'Ой, совсем горячо! Почти попал!',
    guessWon: 'Бинго! В точку!',
    guessAttempts: 'Попытки',
    riddleWelcome: 'Вот тебе хитрая загадка:',
    riddleHintBtn: 'Подсказка',
    riddleNewBtn: 'Новая загадка',
    riddlePlaceholder: 'Ваш ответ...',
    riddleCheckBtn: 'Ответить',
    riddleCorrect: 'Точно! Вот это смекалка!',
    riddleWrong: 'Пока нет, подумай ещё!',
    riddleReveal: 'Ответ:',
  },
  en: {
    subtitle: 'Your personal tutor',
    modeLesson: 'Lesson',
    modeChat: 'Chat',
    modeGames: 'Games',
    heroTitle: 'What shall we learn?',
    heroLoadingTitle: 'Lampo is preparing your lesson...',
    heroSubtitle: 'I explain deeply by drawing, writing, and speaking aloud.',
    heroLoadingSubtitle: 'Preparing whiteboard diagrams, written notes, and lecture voice.',
    placeholder: 'Topic, question, or homework...',
    followUpPlaceholder: 'Ask a follow-up or a new question...',
    internet: 'Internet',
    footerNote: 'Learn on the board, chat like friends, or play games with Lampo',
    writtenPanelTitle: 'Written Explanation',
    summaryTitle: 'Overview',
    formulaTitle: 'Key Rule or Formula',
    lectureFlowTitle: 'Lecture Notes',
    takeawaysTitle: 'Key Takeaways',
    sourcesTitle: 'Sources',
    writingNowLabel: 'Writing...',
    continuousModeLabel: 'Continuous lecture',
    loadingMoreLabel: 'Preparing next part...',
    continueDeeperLabel: 'Continue deeper',
    historyTitle: 'Lesson History',
    historySubtitle: 'Revisit your previous topics',
    historyEmptyTitle: 'No saved lessons yet',
    historyEmptySubtitle: 'Ask anything — Lampo will draw, write, and speak it through.',
    notesButton: 'Written Notes',
    hideNotesButton: 'Hide Notes',
    enableAudioLabel: 'Enable sound',
    micStartTitle: 'Speak with voice',
    micStopTitle: 'Stop recording',
    micListening: 'Listening... Talk to me',
    micTranscribing: 'Transcribing your voice...',
    micPermissionError: 'Microphone access denied. Please allow microphone permission.',
    micEmptyError: 'No speech detected. Please try speaking again.',
    depths: {
      qisqa: 'Short (5–10 min)',
      batafsil: 'Detailed (20–30 min)',
      chuqur: 'Full Lecture (30–60 min)',
    },
    suggestions: [
      'How does the Pythagorean theorem work?',
      'How do plants make food?',
      'Why is the sky blue?',
      'What does y = x² look like?',
    ],
    chatWelcome: "Haha, hey buddy! Ready to laugh and chat?",
    chatPlaceholder: 'Talk to Lampo just like a real friend...',
    chatTapHint: 'Tap Lampo to tickle or poke him',
    chatQuickActions: {
      tickle: 'Tickle',
      tease: 'Tease',
      joke: 'Tell a joke',
      praise: 'Compliment',
      ticklePrompt: 'Tickle tickle, Lampo!',
      teasePrompt: "Hey Lampo, you're just a bouncy little sphere!",
      jokePrompt: 'Tell me a really funny joke!',
      praisePrompt: "Lampo, you're the smartest and coolest buddy!",
    },
    pokeQuips: [
      'Hey! Stop tickling me, haha!',
      'Whoa, poking me again? Careful now!',
      'Wait, wait — I am getting dizzy!',
      'Okay now you are really getting on my nerves!',
      'Hmph! Now I am officially grumpy until you say sorry!',
    ],
    playSuggestedGame: 'Play this game',
    liveStartBtn: 'Start Live Talk',
    liveStopBtn: 'End Live Talk',
    liveListening: 'Listening... Go ahead',
    liveThinking: 'One sec...',
    liveSpeaking: 'Lampo is speaking...',
    liveReadyHint: 'Tap to start a live face-to-face chat',
    liveReconnectLine: 'Oops, zoned out for a second — say that again, friend?',
    gamesTitle: 'Games with Lampo',
    gamesSubtitle: "Let's play! Expect dramatic reactions if you beat me!",
    gameTitles: {
      rps: 'Rock · Paper · Scissors',
      math: 'Speed Math Duel',
      guess: 'Guess the Number!',
      riddle: 'Riddle Challenge',
    },
    gameDescriptions: {
      rps: 'Classic showdown against Lampo!',
      math: 'Race the clock on quick mental math!',
      guess: 'Lampo picked a secret number from 1 to 50!',
      riddle: 'Solve tricky riddles from Lampo!',
    },
    gameBack: 'All games',
    gameYou: 'You',
    gameLampo: 'Lampo',
    gameReset: 'Play again',
    rpsChoices: { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' },
    rpsWelcome: 'Ready! Pick rock, paper, or scissors — bring it on!',
    rpsWin: 'Whoa! You got me that round! Pure luck!',
    rpsLose: 'Ha! Point for me! Try beating that!',
    rpsDraw: 'Great minds think alike! Tie round!',
    mathWelcome: 'Focus up! Solve this as fast as you can!',
    mathStreak: 'Streak',
    mathCheck: 'Check',
    mathNext: 'Next problem',
    mathPlaceholder: 'Your answer...',
    mathCorrect: 'Lightning fast! Nailed it!',
    mathWrong: 'Close, not quite! Answer was:',
    guessWelcome: 'I picked a secret number between 1 and 50. Guess it!',
    guessPlaceholder: '1–50...',
    guessButton: 'Guess',
    guessHigher: 'Go higher!',
    guessLower: 'Too high — go lower!',
    guessHot: 'Ooh, getting super warm!',
    guessWon: 'Boom! You nailed the exact number!',
    guessAttempts: 'Attempts',
    riddleWelcome: 'Think carefully! Here is your riddle:',
    riddleHintBtn: 'Give hint',
    riddleNewBtn: 'New riddle',
    riddlePlaceholder: 'Type answer...',
    riddleCheckBtn: 'Check',
    riddleCorrect: 'Genius! You cracked it!',
    riddleWrong: 'Not quite — try another angle!',
    riddleReveal: 'Answer:',
  },
  tr: {
    subtitle: 'Kişisel öğretmeniniz',
    modeLesson: 'Ders',
    modeChat: 'Sohbet',
    modeGames: 'Oyunlar',
    heroTitle: 'Ne öğrenelim?',
    heroLoadingTitle: 'Lampo dersi hazırlıyor...',
    heroSubtitle: 'Çizerek, yazarak ve sesli anlatarak detaylıca öğretirim.',
    heroLoadingSubtitle: 'Tahta çizimleri, yazılı anlatım ve ses hazırlanıyor.',
    placeholder: 'Konu, soru veya ev ödevi...',
    followUpPlaceholder: 'Devam edin veya yeni soru sorun...',
    internet: 'İnternet',
    footerNote: 'Ders, arkadaşça sohbet veya oyun seçin',
    writtenPanelTitle: 'Yazılı Anlatım',
    summaryTitle: 'Konu Özeti',
    formulaTitle: 'Temel Kural veya Formül',
    lectureFlowTitle: 'Ders Metni',
    takeawaysTitle: 'Önemli Çıkarımlar',
    sourcesTitle: 'Kullanılan Kaynaklar',
    writingNowLabel: 'Yazılıyor...',
    continuousModeLabel: 'Kesintisiz ders',
    loadingMoreLabel: 'Sonraki bölüm hazırlanıyor...',
    continueDeeperLabel: 'Daha derine devam et',
    historyTitle: 'Ders Geçmişi',
    historySubtitle: 'Önceki konuları tekrar inceleyin',
    historyEmptyTitle: 'Henüz kayıtlı ders yok',
    historyEmptySubtitle: 'İstediğiniz soruyu sorun — Lampo çizip yazarak ve konuşarak anlatsın.',
    notesButton: 'Yazılı Not',
    hideNotesButton: 'Notu Gizle',
    enableAudioLabel: 'Sesi aç',
    micStartTitle: 'Sesle konuş',
    micStopTitle: 'Kaydı durdur',
    micListening: 'Dinliyorum... Konuşun',
    micTranscribing: 'Sesiniz yazıya çevriliyor...',
    micPermissionError: 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verin.',
    micEmptyError: 'Ses algılanamadı. Lütfen tekrar konuşun.',
    depths: {
      qisqa: 'Kısa (5–10 dk)',
      batafsil: 'Detaylı (20–30 dk)',
      chuqur: 'Tam Ders (30–60 dk)',
    },
    suggestions: [
      'Pisagor teoremi nasıl çalışır?',
      'Bitkiler nasıl beslenir?',
      'Gökyüzü neden mavidir?',
      'y = x² grafiği nasıl görünür?',
    ],
    chatWelcome: 'Haha, selam dostum! Keyifler nasıl, şakalaşalım mı?',
    chatPlaceholder: 'Lampo ile gerçek bir arkadaş gibi konuş...',
    chatTapHint: 'Gıdıklamak veya kızdırmak için Lampo’ya dokun',
    chatQuickActions: {
      tickle: 'Gıdıkla',
      tease: 'Kızdır',
      joke: 'Şaka yap',
      praise: 'Öv',
      ticklePrompt: 'Gıdıklıyorum seni Lampo!',
      teasePrompt: 'Lampo, sen sadece yuvarlak bir topsun!',
      jokePrompt: 'Bana çok komik bir şaka anlat!',
      praisePrompt: 'Lampo, sen en akıllı ve en eğlenceli dostsun!',
    },
    pokeQuips: [
      'Hey! Gıdıklama, güleceğim şimdi!',
      'Yine mi dokundun? Dikkat et ha!',
      'Dur biraz, başım dönmeye başladı!',
      'Tamam, şimdi gerçekten sinirleniyorum!',
      'Küsdüm işte! Özür dilemezsen konuşmam!',
    ],
    playSuggestedGame: 'Oyunu başlat',
    liveStartBtn: 'Canlı Sohbeti Başlat',
    liveStopBtn: 'Sohbeti Bitir',
    liveListening: 'Dinliyorum... Rahatça konuşun',
    liveThinking: 'Bir saniye...',
    liveSpeaking: 'Lampo konuşuyor...',
    liveReadyHint: 'Basın ve gerçek bir arkadaş gibi canlı konuşun',
    liveReconnectLine: 'Pardon dostum, bir an dalmışım — tekrar söyler misin?',
    gamesTitle: 'Lampo ile Oyunlar',
    gamesSubtitle: 'Hadi oynayalım! Beni yenersen fena bozulurum!',
    gameTitles: {
      rps: 'Taş · Kağıt · Makas',
      math: 'Hızlı Matematik',
      guess: 'Sayıyı Bul!',
      riddle: 'Bilmece',
    },
    gameDescriptions: {
      rps: 'Lampo ile kapışma zamanı!',
      math: 'Hızlı zihinden işlem yarışması!',
      guess: 'Lampo 1 ile 50 arasında bir sayı tuttu!',
      riddle: 'Lampo’nun zekice bilmecelerini çöz!',
    },
    gameBack: 'Tüm oyunlar',
    gameYou: 'Sen',
    gameLampo: 'Lampo',
    gameReset: 'Tekrar oyna',
    rpsChoices: { rock: 'Taş', paper: 'Kağıt', scissors: 'Makas' },
    rpsWelcome: 'Hazır mısın? Taş, kağıt veya makası seç!',
    rpsWin: 'Vay canına! Beni yendin bu turda!',
    rpsLose: 'Haha! Bu tur benim! Tekrar dene bakalım!',
    rpsDraw: 'Berabere! Aynı şeyi düşündük!',
    mathWelcome: 'Hazırsan hızlıca hesapla!',
    mathStreak: 'Seri',
    mathCheck: 'Kontrol et',
    mathNext: 'Sonraki',
    mathPlaceholder: 'Cevabınız...',
    mathCorrect: 'Süper hızlı! Tam isabet!',
    mathWrong: 'Olmadı! Doğru cevap:',
    guessWelcome: '1 ile 50 arasında bir sayı tuttum. Tahmin et!',
    guessPlaceholder: '1–50...',
    guessButton: 'Dene',
    guessHigher: 'Daha büyük bir sayı söyle!',
    guessLower: 'Çok çıktın, biraz in!',
    guessHot: 'Çok yaklaştın, sıcacık!',
    guessWon: 'Harika! Tam sayıyı buldun!',
    guessAttempts: 'Deneme',
    riddleWelcome: 'İşte yeni bilmecen:',
    riddleHintBtn: 'İpucu ver',
    riddleNewBtn: 'Yeni bilmece',
    riddlePlaceholder: 'Cevabı yaz...',
    riddleCheckBtn: 'Cevapla',
    riddleCorrect: 'Müthiş! Hemen bildin!',
    riddleWrong: 'Biraz daha düşün bakalım!',
    riddleReveal: 'Doğru cevap:',
  },
};
