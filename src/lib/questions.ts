import { GameMode, Grade, Question } from "@/types";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAddition(grade: Grade): Question {
  let a: number, b: number;
  if (grade === 1) {
    // 1年生: 1桁+1桁, 答え2~18
    a = randInt(1, 9);
    b = randInt(1, 9);
  } else {
    // 2年生: 2桁+1~2桁, 答え≤99
    a = randInt(10, 70);
    b = randInt(1, 99 - a);
  }
  return { a, b, operator: "+", answer: a + b };
}

function generateSubtraction(grade: Grade): Question {
  let a: number, b: number;
  if (grade === 1) {
    // 1年生: 答えが1以上, a≤18
    a = randInt(2, 18);
    b = randInt(1, a - 1);
  } else {
    // 2年生: 2桁-1~2桁, 答え≥1
    a = randInt(11, 99);
    b = randInt(1, a - 1);
  }
  return { a, b, operator: "-", answer: a - b };
}

function generateMultiplication(): Question {
  // 九九: 1~9 × 1~9
  const a = randInt(1, 9);
  const b = randInt(1, 9);
  return { a, b, operator: "×", answer: a * b };
}

export function generateQuestions(
  grade: Grade,
  mode: GameMode,
  count: number
): Question[] {
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    let question: Question;

    switch (mode) {
      case "addition":
        question = generateAddition(grade);
        break;
      case "subtraction":
        question = generateSubtraction(grade);
        break;
      case "multiplication":
        question = generateMultiplication();
        break;
      case "mix": {
        const modes: GameMode[] =
          grade === 1
            ? ["addition", "subtraction"]
            : ["addition", "subtraction", "multiplication"];
        const selectedMode = modes[randInt(0, modes.length - 1)];
        question = generateQuestions(grade, selectedMode, 1)[0];
        break;
      }
      default:
        question = generateAddition(grade);
    }

    questions.push(question);
  }

  return questions;
}
