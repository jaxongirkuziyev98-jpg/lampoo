import type { AppLanguage } from '../types/lesson';

export interface CurriculumSubject {
  id: string;
  label: Record<AppLanguage, string>;
  topics: Record<AppLanguage, [string, string, string, string]>;
}

export const DTM_SUBJECTS: CurriculumSubject[] = [
  {
    id: 'math',
    label: {
      uz: 'Matematika',
      ru: 'Математика',
      en: 'Mathematics',
      tr: 'Matematik',
    },
    topics: {
      uz: [
        'DTM: Kvadrat tengsizliklar va intervallar usuli',
        'DTM: Logarifmik tenglamalar va asos shartlari',
        'DTM: Trigonometrik ayniyatlar va ildiz topish',
        'DTM: Arifmetik va geometrik progressiya masalalari',
      ],
      ru: [
        'ДТМ: Квадратные неравенства и метод интервалов',
        'ДТМ: Логарифмические уравнения и ОДЗ',
        'ДТМ: Тригонометрические тождества и корни',
        'ДТМ: Задачи на арифметическую и геометрическую прогрессии',
      ],
      en: [
        'DTM: Quadratic inequalities & interval method',
        'DTM: Logarithmic equations & domain traps',
        'DTM: Trigonometric identities & roots',
        'DTM: Arithmetic & geometric progressions',
      ],
      tr: [
        'DTM: İkinci dereceden eşitsizlikler',
        'DTM: Logaritmik denklemler ve tanım kümesi',
        'DTM: Trigonometrik özdeşlikler',
        'DTM: Aritmetik ve geometrik diziler',
      ],
    },
  },
  {
    id: 'physics',
    label: {
      uz: 'Fizika',
      ru: 'Физика',
      en: 'Physics',
      tr: 'Fizik',
    },
    topics: {
      uz: [
        'DTM: Nyuton qonunlari va ishqalanish kuchi',
        "DTM: Om qonuni va aralash zanjir qarshiligi",
        'DTM: Ideal gaz qonunlari va izojarayonlar',
        "DTM: Yorug'lik sinishi va yig'uvchi linza formulasi",
      ],
      ru: [
        'ДТМ: Законы Ньютона и сила трения',
        'ДТМ: Закон Ома и смешанное соединение',
        'ДТМ: Законы идеального газа и изопроцессы',
        'ДТМ: Преломление света и формула тонкой линзы',
      ],
      en: [
        "DTM: Newton's laws & friction problems",
        "DTM: Ohm's law & series-parallel circuits",
        'DTM: Ideal gas law & thermodynamic processes',
        'DTM: Refraction & thin lens equation',
      ],
      tr: [
        'DTM: Newton yasaları ve sürtünme kuvveti',
        'DTM: Ohm yasası ve karışık devreler',
        'DTM: İdeal gaz yasaları',
        'DTM: Işığın kırılması ve ince kenarlı mercek',
      ],
    },
  },
  {
    id: 'biology',
    label: {
      uz: 'Biologiya',
      ru: 'Биология',
      en: 'Biology',
      tr: 'Biyoloji',
    },
    topics: {
      uz: [
        'DTM: Mendel qonunlari va duragaylash masalalari',
        'DTM: Mitoz va meyoz xromosoma soni farqlari',
        'DTM: ATF sintezi va energiya almashinuvi',
        'DTM: DNK komplementarligi va oqsil biosintezi',
      ],
      ru: [
        'ДТМ: Законы Менделя и генетические задачи',
        'ДТМ: Митоз и мейоз — подсчёт хромосом и ДНК',
        'ДТМ: Синтез АТФ и энергетический обмен',
        'ДТМ: Комплементарность ДНК и биосинтез белка',
      ],
      en: [
        "DTM: Mendel's laws & genetics crosses",
        'DTM: Mitosis vs meiosis chromosome counts',
        'DTM: ATP yield & cellular respiration',
        'DTM: DNA complementarity & protein synthesis',
      ],
      tr: [
        'DTM: Mendel yasaları ve kalıtım problemleri',
        'DTM: Mitoz ve mayoz bölünme farkları',
        'DTM: ATP sentezi ve enerji metabolizması',
        'DTM: DNA eşlenmesi ve protein sentezi',
      ],
    },
  },
  {
    id: 'chemistry',
    label: {
      uz: 'Kimyo',
      ru: 'Химия',
      en: 'Chemistry',
      tr: 'Kimya',
    },
    topics: {
      uz: [
        'DTM: Oksidlanish-qaytarilish reaksiyalarini tenglash',
        'DTM: Eritmalar, foiz va molyar konsentratsiya',
        'DTM: Kimyoviy muvozanat va Le-Shatele prinsipi',
        'DTM: Alkanlar va alkenlar izomeriyasi masalalari',
      ],
      ru: [
        'ДТМ: Уравнивание ОВР методом электронного баланса',
        'ДТМ: Процентная и молярная концентрация растворов',
        'ДТМ: Химическое равновесие и принцип Ле Шателье',
        'ДТМ: Изомерия алканов и алкенов',
      ],
      en: [
        'DTM: Balancing redox reactions',
        'DTM: Molarity & solution mass percentage',
        "DTM: Chemical equilibrium & Le Chatelier's principle",
        'DTM: Structural isomerism of alkanes & alkenes',
      ],
      tr: [
        'DTM: Yükseltgenme-indirgenme denkleştirme',
        'DTM: Çözelti derişimi ve molarite',
        'DTM: Kimyasal denge ve Le Chatelier ilkesi',
        'DTM: Alkan ve alken izomerliği',
      ],
    },
  },
  {
    id: 'native',
    label: {
      uz: 'Ona tili',
      ru: 'Родной язык',
      en: 'English DTM',
      tr: 'Dil Bilgisi',
    },
    topics: {
      uz: [
        "DTM: Fe'l nisbatlari va tuslanish qoidalari",
        "DTM: Gap bo'laklari va ergashgan qo'shma gap",
        'DTM: Imlo qoidalari — tutuq belgisi va bosh harf',
        "DTM: So'z turkumlari — sifatdosh va ravishdosh",
      ],
      ru: [
        'ДТМ: Правописание Н и НН в суффиксах',
        'ДТМ: Пунктуация в сложноподчинённом предложении',
        'ДТМ: Чередующиеся гласные в корне слова',
        'ДТМ: Причастный и деепричастный обороты',
      ],
      en: [
        'DTM: Conditionals (Zero, 1st, 2nd, 3rd & Mixed)',
        'DTM: Passive Voice across all tenses',
        'DTM: Reported Speech tense backshift rules',
        'DTM: Prepositions & Phrasal Verbs traps',
      ],
      tr: [
        'DTM: Fiil çatıları ve ek fiil kuralları',
        'DTM: Cümlenin ögeleri ve birleşik cümle',
        'DTM: Yazım kuralları ve noktalama tuzakları',
        'DTM: Fiilimsiler — isim, sıfat, zarf fiil',
      ],
    },
  },
];

export const SCHOOL_TOPICS: Record<AppLanguage, [string, string, string, string]> = {
  uz: [
    '6-sinf Matematika: Kasrlar va foizlarni oson hisoblash',
    '7-sinf Fizika: Tezlik, yo‘l va vaqt grafigini chizish',
    '8-sinf Kimyo: Valentlik va kimyoviy formula tuzish',
    '9-sinf Biologiya: Qon aylanish tizimi va yurak ishi',
  ],
  ru: [
    '6 класс Математика: Дроби и проценты простыми шагами',
    '7 класс Физика: График скорости, пути и времени',
    '8 класс Химия: Валентность и составление формул',
    '9 класс Биология: Круги кровообращения и работа сердца',
  ],
  en: [
    'Grade 6 Math: Fractions and percentages made visual',
    'Grade 7 Physics: Reading distance-time graphs',
    'Grade 8 Chemistry: Valency and balancing formulas',
    'Grade 9 Biology: How the heart and blood vessels work',
  ],
  tr: [
    '6. Sınıf Matematik: Kesirler ve yüzdeler',
    '7. Sınıf Fizik: Hız, yol ve zaman grafiği',
    '8. Sınıf Kimya: Değerlik ve kimyasal formül yazma',
    '9. Sınıf Biyoloji: Kan dolaşımı ve kalbin çalışması',
  ],
};
