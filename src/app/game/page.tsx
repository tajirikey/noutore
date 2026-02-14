"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import DigitCanvas from "@/components/DigitCanvas";
import {
  AccountName,
  GameMode,
  Grade,
  Question,
  GAME_MODE_LABELS,
  TOTAL_QUESTIONS,
} from "@/types";
import { generateQuestions } from "@/lib/questions";
import { recognizeDigit, isCanvasEmpty, loadModel } from "@/lib/recognizer";
import { addRecord } from "@/lib/storage";

type GameState = "loading" | "ready" | "playing" | "finished";

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountName = (searchParams.get("account") || "しろ") as AccountName;
  const grade = Number(searchParams.get("grade") || "1") as Grade;
  const mode = (searchParams.get("mode") || "addition") as GameMode;

  const [gameState, setGameState] = useState<GameState>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tensCanvasRef = useRef<HTMLCanvasElement>(null!);
  const onesCanvasRef = useRef<HTMLCanvasElement>(null!);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const isShiro = accountName === "しろ";

  // Load model on mount
  useEffect(() => {
    loadModel()
      .then(() => {
        setQuestions(generateQuestions(grade, mode, TOTAL_QUESTIONS));
        setGameState("ready");
      })
      .catch((err) => {
        console.error("Model load failed:", err);
        // Fallback: still allow playing, recognition might fail
        setQuestions(generateQuestions(grade, mode, TOTAL_QUESTIONS));
        setGameState("ready");
      });
  }, [grade, mode]);

  // Timer
  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, startTime]);

  const clearCanvases = useCallback(() => {
    [tensCanvasRef, onesCanvasRef].forEach((ref) => {
      const canvas = ref.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
  }, []);

  const startGame = () => {
    const now = Date.now();
    setStartTime(now);
    setElapsed(0);
    setCurrentIdx(0);
    setCorrectCount(0);
    setGameState("playing");
    clearCanvases();
  };

  const handleSubmit = async () => {
    if (submitting || gameState !== "playing") return;
    setSubmitting(true);

    try {
      let userAnswer = 0;

      // Recognize tens digit
      if (tensCanvasRef.current && !isCanvasEmpty(tensCanvasRef.current)) {
        const tensResult = await recognizeDigit(tensCanvasRef.current);
        userAnswer += tensResult.digit * 10;
      }

      // Recognize ones digit
      if (onesCanvasRef.current && !isCanvasEmpty(onesCanvasRef.current)) {
        const onesResult = await recognizeDigit(onesCanvasRef.current);
        userAnswer += onesResult.digit;
      }

      const currentQuestion = questions[currentIdx];
      const isCorrect = userAnswer === currentQuestion.answer;

      if (isCorrect) {
        setCorrectCount((c) => c + 1);
      }

      // Show feedback
      setFeedback(isCorrect ? "correct" : "wrong");

      setTimeout(() => {
        setFeedback(null);

        if (currentIdx + 1 >= TOTAL_QUESTIONS) {
          // Game finished
          const finalTime = Date.now() - startTime;
          setElapsed(finalTime);
          if (timerRef.current) clearInterval(timerRef.current);

          const newCorrect = correctCount + (isCorrect ? 1 : 0);

          addRecord(accountName, {
            date: new Date().toISOString(),
            mode,
            grade,
            timeMs: finalTime,
            correct: newCorrect,
            total: TOTAL_QUESTIONS,
          });

          router.push(
            `/result?account=${encodeURIComponent(accountName)}&grade=${grade}&mode=${mode}&time=${finalTime}&correct=${newCorrect}&total=${TOTAL_QUESTIONS}`
          );
        } else {
          setCurrentIdx((i) => i + 1);
          clearCanvases();
        }
      }, 600);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
    }
    return `${seconds}.${tenths}`;
  };

  if (gameState === "loading") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-3xl text-gray-400 animate-pulse">
          じゅんびちゅう...
        </div>
      </main>
    );
  }

  if (gameState === "ready") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            {GAME_MODE_LABELS[mode]}
          </h2>
          <p className="text-xl text-gray-500 mb-2">
            {grade}ねんせい ・ {TOTAL_QUESTIONS}もん
          </p>
          <p className="text-lg text-gray-400 mb-12">
            できるだけはやくとこう！
          </p>
          <button
            onClick={startGame}
            className="px-16 py-6 rounded-3xl text-3xl font-bold text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all"
            style={{
              backgroundColor: isShiro ? "#6366f1" : "#ec4899",
            }}
          >
            スタート！
          </button>
        </div>
      </main>
    );
  }

  const currentQuestion = questions[currentIdx];

  return (
    <main className="flex flex-col items-center min-h-screen p-4">
      {/* Top bar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <span className="text-lg text-gray-500 font-bold">
          {GAME_MODE_LABELS[mode]} ({grade}ねん)
        </span>
        <span className="text-4xl font-mono font-bold text-gray-800">
          {formatTime(elapsed)}
        </span>
        <span className="text-lg text-gray-500 font-bold">
          {currentIdx + 1} / {TOTAL_QUESTIONS}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl h-3 bg-gray-200 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${((currentIdx) / TOTAL_QUESTIONS) * 100}%`,
            backgroundColor: isShiro ? "#6366f1" : "#ec4899",
          }}
        />
      </div>

      {/* Question */}
      <div className="text-6xl font-bold text-gray-800 mb-8 tracking-wider relative">
        {currentQuestion.a} {currentQuestion.operator} {currentQuestion.b} ={" "}
        <span className="text-indigo-300">？</span>

        {/* Feedback overlay */}
        {feedback && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`text-8xl ${
                feedback === "correct" ? "text-green-500" : "text-red-500"
              } animate-bounce`}
            >
              {feedback === "correct" ? "⭕" : "✕"}
            </span>
          </div>
        )}
      </div>

      {/* Wrong answer display */}
      {feedback === "wrong" && (
        <div className="text-2xl text-red-400 mb-4 font-bold">
          こたえ: {currentQuestion.answer}
        </div>
      )}

      {/* Canvas inputs */}
      <div className="flex items-end gap-6 mb-8">
        <DigitCanvas
          canvasRef={tensCanvasRef}
          label="十のくらい"
          width={160}
          height={200}
          lineWidth={10}
        />
        <DigitCanvas
          canvasRef={onesCanvasRef}
          label="一のくらい"
          width={160}
          height={200}
          lineWidth={10}
        />
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || feedback !== null}
        className="px-14 py-5 rounded-3xl text-3xl font-bold text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        style={{
          backgroundColor: isShiro ? "#6366f1" : "#ec4899",
        }}
      >
        こたえる！
      </button>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-2xl text-gray-400">よみこみちゅう...</div>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
