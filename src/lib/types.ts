// 类型定义：与 supabase/schema.sql 一致

export interface Student {
  id: string;
  name: string;
  avatar: string;
}

export interface Word {
  id: string;
  book_id: string;
  en: string;
  zh: string;
  phon: string;
  ex: string;
}

export interface Book {
  id: string;
  group_id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface Progress {
  learned: boolean;
  mastered: boolean;
}

export interface WrongRec {
  wrong_count: number;
  last_wrong_at: string;
}

export interface ReviewRec {
  box: number;
  next_review: string;
  last_review: string;
}

export interface DayStat {
  learn: number;
  quiz: number;
  right: number;
  wrong: number;
}

export interface LeaderEntry {
  mode: string;
  date: string;
  total: number;
  right: number;
  wrong: number;
  time: number;
  pct: number;
  score: number;
}

export interface Settings {
  realtimeCheck: boolean;
  rtReveal: boolean;
  darkTheme: boolean;
  timerEnabled: boolean;
  timerSec: number;
  fontSize: "small" | "normal" | "large" | "xlarge";
  permConfig: {
    realtimeCheck: boolean; // true = 学生模式禁用
    rtReveal: boolean;
    previewWords: boolean;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  realtimeCheck: false,
  rtReveal: false,
  darkTheme: false,
  timerEnabled: false,
  timerSec: 15,
  fontSize: "normal",
  permConfig: { realtimeCheck: true, rtReveal: true, previewWords: true },
};

export type QuizMode =
  | "ce" | "ec" | "listen" | "review"
  | "learn-card" | "learn-list" | "choice" | "learned-quiz"
  | "smart" | "ebbing";

export const MODE_LABEL: Record<QuizMode, string> = {
  ce: "中→英默写",
  ec: "英→中默写",
  listen: "听音拼写",
  review: "错词复习",
  "learn-card": "卡片学习",
  "learn-list": "列表学习",
  choice: "选择题",
  "learned-quiz": "学后默写",
  smart: "智能推荐",
  ebbing: "到期复习",
};

// 本轮答题队列中的一个条目：单词 + 该学生的实时状态
export interface QuizWord extends Word {
  learned: boolean;
  mastered: boolean;
}

export interface QuizState {
  mode: QuizMode;
  queue: QuizWord[];
  idx: number;
  right: number;
  wrong: number;
  skip: number;
  wrongThisRound: Word[];
  answered: boolean;
  retries: number;
  startTime: number;
  totalTime: number;
  feedback: "" | "ok" | "bad" | "retry";
  feedbackText: string;
  choiceOptions: string[];
  cardFlipped: boolean;
}
