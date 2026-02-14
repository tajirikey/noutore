export type AccountName = "しろ" | "かわ";
export type Grade = 1 | 2;
export type GameMode = "addition" | "subtraction" | "multiplication" | "mix";

export interface Question {
  a: number;
  b: number;
  operator: "+" | "-" | "×";
  answer: number;
}

export interface GameRecord {
  date: string;
  mode: GameMode;
  grade: Grade;
  timeMs: number;
  correct: number;
  total: number;
}

export interface AccountData {
  name: AccountName;
  grade: Grade;
  records: GameRecord[];
}

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  addition: "たし算",
  subtraction: "ひき算",
  multiplication: "九九",
  mix: "ミックス",
};

export const TOTAL_QUESTIONS = 20;
