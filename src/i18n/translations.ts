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
  xoWelcome: string;
  xoYourTurn: string;
  xoLampoTurn: string;
  xoWin: string;
  xoLose: string;
  xoDraw: string;
  mathWelcome: string;
  mathStreak: string;
  mathCheck: string;
  mathNext: string;
  mathPlaceholder: string;
  mathCorrect: string;
  mathWrong: string;
  memoryWelcome: string;
  memoryMoves: string;
  memoryPairs: string;
  memoryMatch: string;
  memoryMiss: string;
  memoryWon: string;
  riddleWelcome: string;
  riddleHintBtn: string;
  riddleNewBtn: string;
  riddlePlaceholder: string;
  riddleCheckBtn: string;
  riddleCorrect: string;
  riddleWrong: string;
  riddleReveal: string;
  tracks: Record<'general' | 'dtm' | 'school', string>;
  trackSubtitles: Record<'general' | 'dtm' | 'school', string>;
  photoAttachLabel: string;
  photoRemoveLabel: string;
  photoPlaceholder: string;
  photoDefaultQuestion: string;
  photoError: string;
  miniTestButton: string;
  miniTestEndPrompt: string;
  miniTestTitle: string;
  miniTestLoading: string;
  miniTestError: string;
  miniTestRetryLoad: string;
  miniTestTestMode: string;
  miniTestFlashcardMode: string;
  miniTestRetryLabel: string;
  miniTestHintBtn: string;
  miniTestNextBtn: string;
  miniTestFinishBtn: string;
  miniTestFlipPrompt: string;
  miniTestHardBtn: string;
  miniTestEasyBtn: string;
  miniTestCorrectReact: string;
  miniTestWrongReact: string;
  miniTestSummaryTitle: string;
  miniTestSummaryNote: string;
  miniTestRestartBtn: string;
  miniTestCloseBtn: string;
  srsReviewTitle: string;
  srsDueCountSuffix: string;
  srsReviewBtn: string;
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
      xo: 'X va O Dueli',
      math: 'Tez Hisob Dueli',
      memory: 'Juftini Top!',
      riddle: 'Topishmoq',
    },
    gameDescriptions: {
      xo: "3×3 katakda Lamponi yutishga urinib ko'r!",
      math: 'Tezlikka misollar yechib Lamponi hayron qoldir!',
      memory: 'Kartalarni ochib bir xil juftliklarni xotiradan top!',
      riddle: 'Lamponing aqlli topishmoqlariga javob top!',
    },
    gameBack: "Barcha o'yinlar",
    gameYou: 'Siz',
    gameLampo: 'Lampo',
    gameReset: 'Qayta boshlash',
    xoWelcome: "Qani boshladik! Sen X, men O — bo'sh katakni bos!",
    xoYourTurn: 'Sizning navbatingiz (X)',
    xoLampoTurn: "Lampo o'ylamoqda...",
    xoWin: "Voy-bo'! Meni yutib qo'yding-ku! Qoyil senga!",
    xoLose: 'Ha-ha! Bu safar men yutdim! Yana bir raundmi?',
    xoDraw: 'Kuchlar teng keldi! Durrang — qayta o‘ynaymizmi?',
    mathWelcome: 'Tayyormisan? Misolni tez va to‘g‘ri yech!',
    mathStreak: 'Ketma-ketlik',
    mathCheck: 'Tekshirish',
    mathNext: 'Keyingi misol',
    mathPlaceholder: 'Javobingiz...',
    mathCorrect: 'Barakalla! Chaqmoqdek tez javob berding!',
    mathWrong: "O‘xshamadi-ku! To‘g‘ri javob:",
    memoryWelcome: 'Kartalarni ochib bir xil juftlarni top — xotirangni sinaymiz!',
    memoryMoves: 'Urinish',
    memoryPairs: 'Juftlik',
    memoryMatch: 'Zo‘r! Xuddi o‘sha juftini topding!',
    memoryMiss: 'Eee, boshqacha chiqdi! Qayerda turganini eslab qol!',
    memoryWon: 'Ana xolos! Hamma juftlarni bir zumda topib tashlading!',
    riddleWelcome: 'Qani bosh qotiramiz! Mana senga yangi topishmoq:',
    riddleHintBtn: 'Yordam ber',
    riddleNewBtn: 'Yangi topishmoq',
    riddlePlaceholder: 'Javobni yozing...',
    riddleCheckBtn: 'Topdim!',
    riddleCorrect: 'Zo‘r! Topishmoqni bir zumda topding!',
    riddleWrong: 'Sal boshqacha o‘ylab ko‘r-chi, hali topilmadi!',
    riddleReveal: "To'g'ri javob:",
    tracks: {
      general: 'Umumiy',
      dtm: 'DTM / Abituriyent',
      school: 'Maktab dasturi',
    },
    trackSubtitles: {
      general: 'Chizib, yozib va ovoz chiqarib batafsil tushuntiraman.',
      dtm: 'DTM test tuzoqlari, tezkor usullar va abituriyent mashqlari bilan.',
      school: 'Maktab darsliklari asosida sodda, tushunarli qadamlar bilan.',
    },
    photoAttachLabel: 'Rasm yuklash',
    photoRemoveLabel: 'Rasmni olib tashlash',
    photoPlaceholder: 'Rasm bo‘yicha izoh yozing yoki to‘g‘ridan-to‘g‘ri yuboring...',
    photoDefaultQuestion: 'Rasmdagi masala yoki matnni qadamma-qadam yechib tushuntirib ber',
    photoError: 'Rasmni yuklab bo‘lmadi. Boshqa JPG yoki PNG rasm tanlang.',
    miniTestButton: 'Mini-test',
    miniTestEndPrompt: 'Mavzuni mustahkamlash uchun 4–5 ta savolli mini-test yechasizmi?',
    miniTestTitle: 'Mini-test va Flashcard',
    miniTestLoading: 'Lampo mavzu bo‘yicha savollar tuzmoqda...',
    miniTestError: 'Savollarni yuklab bo‘lmadi. Qayta urinib ko‘ring.',
    miniTestRetryLoad: 'Qayta urinish',
    miniTestTestMode: 'Test savollari',
    miniTestFlashcardMode: 'Flashcard',
    miniTestRetryLabel: 'Qayta so‘ralmoqda',
    miniTestHintBtn: 'Yordam',
    miniTestNextBtn: 'Keyingi savol',
    miniTestFinishBtn: 'Natijani ko‘rish',
    miniTestFlipPrompt: 'Javobni ko‘rish uchun kartani bosing',
    miniTestHardBtn: 'Qiyin · keyinroq so‘ra',
    miniTestEasyBtn: 'Yodda qoldi',
    miniTestCorrectReact: 'Barakalla! Xuddi shunday davom et!',
    miniTestWrongReact: 'Hechqisi yo‘q, tushunib olamiz — buni sal turib yana so‘rayman!',
    miniTestSummaryTitle: 'Natija tayyor',
    miniTestSummaryNote: 'Xato qilingan savollar oraliqli takrorlash navbatiga qo‘shildi.',
    miniTestRestartBtn: 'Qayta ishlash',
    miniTestCloseBtn: 'Darsga qaytish',
    srsReviewTitle: 'Takrorlash navbati',
    srsDueCountSuffix: 'ta savol qayta tekshirishni kutmoqda',
    srsReviewBtn: 'Takrorlash',
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
      xo: 'Крестики-нолики',
      math: 'Быстрый счёт',
      memory: 'Найди пару!',
      riddle: 'Загадки',
    },
    gameDescriptions: {
      xo: 'Обыграй Лампо на поле 3×3!',
      math: 'Решай примеры на скорость!',
      memory: 'Открывай карточки и собирай пары по памяти!',
      riddle: 'Отгадай хитрые загадки Лампо!',
    },
    gameBack: 'Все игры',
    gameYou: 'Вы',
    gameLampo: 'Лампо',
    gameReset: 'Заново',
    xoWelcome: 'Погнали! Ты за X, я за O — выбирай клетку!',
    xoYourTurn: 'Твой ход (X)',
    xoLampoTurn: 'Лампо думает...',
    xoWin: 'Ого! Ты меня обыграл! Ну ничего, я ещё отыграюсь!',
    xoLose: 'Ха-ха! Победа за мной! Сыграем ещё?',
    xoDraw: 'Ничья! Силы равны!',
    mathWelcome: 'Готов? Решай пример как можно быстрее!',
    mathStreak: 'Серия',
    mathCheck: 'Проверить',
    mathNext: 'Следующий',
    mathPlaceholder: 'Ваш ответ...',
    mathCorrect: 'Молниеносно и точно! Браво!',
    mathWrong: 'Мимо! Правильный ответ:',
    memoryWelcome: 'Открывай карточки и найди все пары — проверим твою память!',
    memoryMoves: 'Ходы',
    memoryPairs: 'Пары',
    memoryMatch: 'Класс! Точное попадание!',
    memoryMiss: 'Не совпали! Запомни, где они лежат!',
    memoryWon: 'Браво! Все пары собраны!',
    riddleWelcome: 'Вот тебе хитрая загадка:',
    riddleHintBtn: 'Подсказка',
    riddleNewBtn: 'Новая загадка',
    riddlePlaceholder: 'Ваш ответ...',
    riddleCheckBtn: 'Ответить',
    riddleCorrect: 'Точно! Вот это смекалка!',
    riddleWrong: 'Пока нет, подумай ещё!',
    riddleReveal: 'Ответ:',
    tracks: {
      general: 'Общий',
      dtm: 'ДТМ / Абитуриент',
      school: 'Школьная программа',
    },
    trackSubtitles: {
      general: 'Подробно объясню рисуя, письменно и вслух.',
      dtm: 'Ловушки ДТМ, быстрые приёмы и экзаменационные задачи.',
      school: 'Понятные шаги строго по школьной программе.',
    },
    photoAttachLabel: 'Загрузить фото',
    photoRemoveLabel: 'Убрать фото',
    photoPlaceholder: 'Добавьте вопрос к фото или отправьте сразу...',
    photoDefaultQuestion: 'Реши задачу или объясни материал с этого фото шаг за шагом',
    photoError: 'Не удалось прочитать изображение. Выберите файл JPG или PNG.',
    miniTestButton: 'Мини-тест',
    miniTestEndPrompt: 'Закрепим тему? Пройдите короткий мини-тест из 4–5 вопросов.',
    miniTestTitle: 'Мини-тест и карточки',
    miniTestLoading: 'Лампо составляет вопросы по уроку...',
    miniTestError: 'Не удалось загрузить тест. Попробуйте снова.',
    miniTestRetryLoad: 'Повторить',
    miniTestTestMode: 'Тест',
    miniTestFlashcardMode: 'Карточки',
    miniTestRetryLabel: 'Повторный вопрос',
    miniTestHintBtn: 'Подсказка',
    miniTestNextBtn: 'Следующий вопрос',
    miniTestFinishBtn: 'Завершить',
    miniTestFlipPrompt: 'Нажмите на карточку, чтобы увидеть ответ',
    miniTestHardBtn: 'Сложно · повторить позже',
    miniTestEasyBtn: 'Запомнил',
    miniTestCorrectReact: 'Отлично! Так держать!',
    miniTestWrongReact: 'Ничего страшного — разберёмся, я переспрошу этот вопрос чуть позже!',
    miniTestSummaryTitle: 'Мини-тест завершён',
    miniTestSummaryNote: 'Ошибочные вопросы добавлены в интервальное повторение.',
    miniTestRestartBtn: 'Пройти снова',
    miniTestCloseBtn: 'К уроку',
    srsReviewTitle: 'Интервальное повторение',
    srsDueCountSuffix: 'вопр. ждут повторения',
    srsReviewBtn: 'Повторить',
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
      xo: 'Tic-Tac-Toe Duel',
      math: 'Speed Math Duel',
      memory: 'Memory Match',
      riddle: 'Riddle Challenge',
    },
    gameDescriptions: {
      xo: 'Outsmart Lampo on the 3×3 grid!',
      math: 'Race the clock on quick mental math!',
      memory: 'Flip cards and match all pairs by memory!',
      riddle: 'Solve tricky riddles from Lampo!',
    },
    gameBack: 'All games',
    gameYou: 'You',
    gameLampo: 'Lampo',
    gameReset: 'Play again',
    xoWelcome: "Let's go! You are X, I am O — pick any square!",
    xoYourTurn: 'Your turn (X)',
    xoLampoTurn: 'Lampo is thinking...',
    xoWin: 'Whoa! You beat me! Nice strategy!',
    xoLose: 'Ha-ha! Victory is mine! Rematch?',
    xoDraw: 'Draw! Perfectly matched minds!',
    mathWelcome: 'Focus up! Solve this as fast as you can!',
    mathStreak: 'Streak',
    mathCheck: 'Check',
    mathNext: 'Next problem',
    mathPlaceholder: 'Your answer...',
    mathCorrect: 'Lightning fast! Nailed it!',
    mathWrong: 'Close, not quite! Answer was:',
    memoryWelcome: 'Flip cards and match every pair — test your memory!',
    memoryMoves: 'Moves',
    memoryPairs: 'Pairs',
    memoryMatch: 'Awesome! Direct match!',
    memoryMiss: 'Oops, different icons — remember their spots!',
    memoryWon: 'Boom! You cleared the whole board!',
    riddleWelcome: 'Think carefully! Here is your riddle:',
    riddleHintBtn: 'Give hint',
    riddleNewBtn: 'New riddle',
    riddlePlaceholder: 'Type answer...',
    riddleCheckBtn: 'Check',
    riddleCorrect: 'Genius! You cracked it!',
    riddleWrong: 'Not quite — try another angle!',
    riddleReveal: 'Answer:',
    tracks: {
      general: 'General',
      dtm: 'DTM / Exam Prep',
      school: 'School Syllabus',
    },
    trackSubtitles: {
      general: 'I explain deeply by drawing, writing, and speaking aloud.',
      dtm: 'Exam traps, speed shortcuts, and university entrance practice.',
      school: 'Clear grade-level explanations aligned to school textbooks.',
    },
    photoAttachLabel: 'Upload photo',
    photoRemoveLabel: 'Remove photo',
    photoPlaceholder: 'Add a note about the photo or send right away...',
    photoDefaultQuestion: 'Solve and explain the problem shown in this photo step by step',
    photoError: 'Could not read that image. Try a JPG or PNG file.',
    miniTestButton: 'Mini-Quiz',
    miniTestEndPrompt: 'Ready to lock it in? Try a 4–5 question mini-quiz with Lampo.',
    miniTestTitle: 'Mini-Quiz & Flashcards',
    miniTestLoading: 'Lampo is crafting questions from this lesson...',
    miniTestError: 'Could not load quiz questions. Please retry.',
    miniTestRetryLoad: 'Retry',
    miniTestTestMode: 'Quiz',
    miniTestFlashcardMode: 'Flashcards',
    miniTestRetryLabel: 'Review question',
    miniTestHintBtn: 'Hint',
    miniTestNextBtn: 'Next question',
    miniTestFinishBtn: 'See results',
    miniTestFlipPrompt: 'Click card to flip and reveal rule',
    miniTestHardBtn: 'Hard · ask again soon',
    miniTestEasyBtn: 'Got it',
    miniTestCorrectReact: 'Spot on! Keep that momentum going!',
    miniTestWrongReact: "No worries — let's review it, and I will ask you again shortly!",
    miniTestSummaryTitle: 'Quiz Complete',
    miniTestSummaryNote: 'Missed questions are queued for spaced repetition review.',
    miniTestRestartBtn: 'Try again',
    miniTestCloseBtn: 'Back to lesson',
    srsReviewTitle: 'Spaced Repetition',
    srsDueCountSuffix: 'questions due for review',
    srsReviewBtn: 'Review now',
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
      xo: 'X ve O Düellosu',
      math: 'Hızlı Matematik',
      memory: 'Çiftini Bul!',
      riddle: 'Bilmece',
    },
    gameDescriptions: {
      xo: "3×3 tabloda Lampo'yu yenmeye çalış!",
      math: 'Hızlı zihinden işlem yarışması!',
      memory: 'Kartları aç ve tüm çiftleri hafızanla bul!',
      riddle: 'Lampo’nun zekice bilmecelerini çöz!',
    },
    gameBack: 'Tüm oyunlar',
    gameYou: 'Sen',
    gameLampo: 'Lampo',
    gameReset: 'Tekrar oyna',
    xoWelcome: 'Hazır mısın? Sen X, ben O — bir kare seç!',
    xoYourTurn: 'Senin sıran (X)',
    xoLampoTurn: 'Lampo düşünüyor...',
    xoWin: 'Vay canına! Beni yendin bu turda!',
    xoLose: 'Haha! Bu tur benim! Tekrar dene bakalım!',
    xoDraw: 'Berabere! Başa baş mücadele!',
    mathWelcome: 'Hazırsan hızlıca hesapla!',
    mathStreak: 'Seri',
    mathCheck: 'Kontrol et',
    mathNext: 'Sonraki',
    mathPlaceholder: 'Cevabınız...',
    mathCorrect: 'Süper hızlı! Tam isabet!',
    mathWrong: 'Olmadı! Doğru cevap:',
    memoryWelcome: 'Kartları aç ve aynı çiftleri bul — hafızanı görelim!',
    memoryMoves: 'Hamle',
    memoryPairs: 'Çift',
    memoryMatch: 'Süper! Tam eşleşme!',
    memoryMiss: 'Farklı çıktı, yerini aklında tut!',
    memoryWon: 'Harika! Tüm çiftleri buldun!',
    riddleWelcome: 'İşte yeni bilmecen:',
    riddleHintBtn: 'İpucu ver',
    riddleNewBtn: 'Yeni bilmece',
    riddlePlaceholder: 'Cevabı yaz...',
    riddleCheckBtn: 'Cevapla',
    riddleCorrect: 'Müthiş! Hemen bildin!',
    riddleWrong: 'Biraz daha düşün bakalım!',
    riddleReveal: 'Doğru cevap:',
    tracks: {
      general: 'Genel',
      dtm: 'DTM / Sınav Hazırlık',
      school: 'Okul Müfredatı',
    },
    trackSubtitles: {
      general: 'Çizerek, yazarak ve sesli anlatarak detaylıca öğretirim.',
      dtm: 'Sınav tuzakları, hızlı çözüm yolları ve çıkmış konu pratikleri.',
      school: 'Okul müfredatına uygun sade ve adım adım anlatım.',
    },
    photoAttachLabel: 'Fotoğraf yükle',
    photoRemoveLabel: 'Fotoğrafı kaldır',
    photoPlaceholder: 'Fotoğraf hakkında not ekleyin veya hemen gönderin...',
    photoDefaultQuestion: 'Bu fotoğraftaki soruyu veya konuyu adım adım tahtada çöz ve anlat',
    photoError: 'Görsel okunamadı. Lütfen JPG veya PNG seçin.',
    miniTestButton: 'Mini Test',
    miniTestEndPrompt: 'Konuyu pekiştirmek için 4–5 soruluk mini teste geçelim mi?',
    miniTestTitle: 'Mini Test ve Bilgi Kartları',
    miniTestLoading: 'Lampo bu dersten sorular hazırlıyor...',
    miniTestError: 'Sorular yüklenemedi. Tekrar deneyin.',
    miniTestRetryLoad: 'Tekrar dene',
    miniTestTestMode: 'Test',
    miniTestFlashcardMode: 'Bilgi Kartı',
    miniTestRetryLabel: 'Tekrar sorusu',
    miniTestHintBtn: 'İpucu',
    miniTestNextBtn: 'Sonraki soru',
    miniTestFinishBtn: 'Sonucu gör',
    miniTestFlipPrompt: 'Cevabı görmek için karta dokunun',
    miniTestHardBtn: 'Zor · sonra tekrar sor',
    miniTestEasyBtn: 'Öğrendim',
    miniTestCorrectReact: 'Harika! Aynen böyle devam!',
    miniTestWrongReact: 'Sorun değil, mantığını görelim — birazdan bunu tekrar soracağım!',
    miniTestSummaryTitle: 'Test Tamamlandı',
    miniTestSummaryNote: 'Yanlış yapılan sorular aralıklı tekrar sırasına eklendi.',
    miniTestRestartBtn: 'Tekrar çöz',
    miniTestCloseBtn: 'Derse dön',
    srsReviewTitle: 'Aralıklı Tekrar',
    srsDueCountSuffix: 'soru tekrar bekliyor',
    srsReviewBtn: 'Tekrar et',
  },
};
