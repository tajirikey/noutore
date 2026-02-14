"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AccountName,
  GameMode,
  Grade,
  GAME_MODE_LABELS,
} from "@/types";
import { getAccount, setGrade, getBestTime } from "@/lib/storage";

function SelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountName = (searchParams.get("account") || "しろ") as AccountName;
  const account = getAccount(accountName);

  const [grade, setGradeState] = useState<Grade>(account.grade);

  const isShiro = accountName === "しろ";
  const themeColor = isShiro ? "indigo" : "pink";

  const handleGradeChange = (g: Grade) => {
    setGradeState(g);
    setGrade(accountName, g);
  };

  const startGame = (mode: GameMode) => {
    router.push(
      `/game?account=${encodeURIComponent(accountName)}&grade=${grade}&mode=${mode}`
    );
  };

  const formatTime = (ms: number | null): string => {
    if (ms === null) return "---";
    const s = ms / 1000;
    return `${s.toFixed(1)}びょう`;
  };

  const modes: GameMode[] =
    grade === 1
      ? ["addition", "subtraction", "mix"]
      : ["addition", "subtraction", "multiplication", "mix"];

  return (
    <main className="flex flex-col items-center min-h-screen p-6">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8">
        <button
          onClick={() => router.push("/")}
          className="text-lg text-gray-500 hover:text-gray-700 px-4 py-2"
        >
          ← もどる
        </button>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold" style={{ color: isShiro ? "#4338ca" : "#be185d" }}>
            {accountName}
          </span>
        </div>
        <div className="w-20" />
      </div>

      {/* Grade Selection */}
      <div className="mb-10">
        <p className="text-xl text-gray-600 mb-4 text-center font-bold">
          がくねん
        </p>
        <div className="flex gap-4">
          {([1, 2] as Grade[]).map((g) => (
            <button
              key={g}
              onClick={() => handleGradeChange(g)}
              className={`px-8 py-4 rounded-2xl text-2xl font-bold transition-all ${
                grade === g
                  ? `bg-${themeColor}-500 text-white shadow-lg scale-105`
                  : `bg-white text-gray-600 border-2 border-gray-200 hover:border-${themeColor}-300`
              }`}
              style={
                grade === g
                  ? { backgroundColor: isShiro ? "#6366f1" : "#ec4899" }
                  : {}
              }
            >
              {g}ねんせい
            </button>
          ))}
        </div>
      </div>

      {/* Mode Selection */}
      <div className="w-full max-w-lg">
        <p className="text-xl text-gray-600 mb-4 text-center font-bold">
          もんだいをえらぼう
        </p>
        <div className="grid grid-cols-2 gap-4">
          {modes.map((mode) => {
            const best = getBestTime(accountName, grade, mode);
            return (
              <button
                key={mode}
                onClick={() => startGame(mode)}
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-gray-400 active:scale-95 transition-all shadow-md hover:shadow-lg text-left"
              >
                <div className="text-2xl font-bold text-gray-800 mb-2">
                  {GAME_MODE_LABELS[mode]}
                </div>
                <div className="text-sm text-gray-400">
                  ベスト: {formatTime(best)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function SelectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-2xl text-gray-400">よみこみちゅう...</div>
        </div>
      }
    >
      <SelectContent />
    </Suspense>
  );
}
