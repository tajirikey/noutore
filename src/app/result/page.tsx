"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  AccountName,
  GameMode,
  Grade,
  GAME_MODE_LABELS,
  TOTAL_QUESTIONS,
} from "@/types";
import { getBestTime, getRecords } from "@/lib/storage";

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountName = (searchParams.get("account") || "しろ") as AccountName;
  const grade = Number(searchParams.get("grade") || "1") as Grade;
  const mode = (searchParams.get("mode") || "addition") as GameMode;
  const timeMs = Number(searchParams.get("time") || "0");
  const correct = Number(searchParams.get("correct") || "0");
  const total = Number(searchParams.get("total") || TOTAL_QUESTIONS);

  const isShiro = accountName === "しろ";
  const isPerfect = correct === total;
  const bestTime = getBestTime(accountName, grade, mode);
  const isNewRecord = isPerfect && (bestTime === null || timeMs <= bestTime);

  const records = getRecords(accountName, grade, mode as any);
  const recentRecords = records.slice(-5).reverse();

  const formatTime = (ms: number): string => {
    const s = ms / 1000;
    return `${s.toFixed(1)}びょう`;
  };

  const getComment = (): string => {
    if (isPerfect && isNewRecord) return "しんきろく！すごい！";
    if (isPerfect) return "ぜんもんせいかい！";
    if (correct >= total * 0.8) return "よくできました！";
    if (correct >= total * 0.5) return "がんばったね！";
    return "もういちどチャレンジ！";
  };

  return (
    <main className="flex flex-col items-center min-h-screen p-6">
      <h1
        className="text-4xl font-extrabold mb-2 mt-8"
        style={{ color: isShiro ? "#4338ca" : "#be185d" }}
      >
        けっか
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {accountName} ・ {grade}ねんせい ・ {GAME_MODE_LABELS[mode]}
      </p>

      {/* Main result */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 text-center w-full max-w-md">
        {isNewRecord && (
          <div className="text-2xl text-yellow-500 font-bold mb-2 animate-bounce">
            NEW RECORD!
          </div>
        )}

        <div className="text-6xl font-bold text-gray-800 mb-2">
          {formatTime(timeMs)}
        </div>

        <div className="text-2xl text-gray-600 mb-4">
          {correct} / {total} もんせいかい
        </div>

        <div
          className="text-2xl font-bold"
          style={{ color: isShiro ? "#6366f1" : "#ec4899" }}
        >
          {getComment()}
        </div>
      </div>

      {/* Best time */}
      {bestTime !== null && (
        <div className="text-lg text-gray-500 mb-6">
          ベストタイム: {formatTime(bestTime)}（ぜんもんせいかい）
        </div>
      )}

      {/* Recent records */}
      {recentRecords.length > 1 && (
        <div className="w-full max-w-md mb-8">
          <h3 className="text-lg font-bold text-gray-600 mb-3">
            さいきんのきろく
          </h3>
          <div className="space-y-2">
            {recentRecords.map((r, i) => (
              <div
                key={i}
                className="flex justify-between bg-white rounded-xl px-4 py-2 text-sm"
              >
                <span className="text-gray-500">
                  {new Date(r.date).toLocaleDateString("ja-JP")}
                </span>
                <span className="text-gray-800 font-bold">
                  {formatTime(r.timeMs)}
                </span>
                <span className="text-gray-500">
                  {r.correct}/{r.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() =>
            router.push(
              `/game?account=${encodeURIComponent(accountName)}&grade=${grade}&mode=${mode}`
            )
          }
          className="px-10 py-4 rounded-2xl text-xl font-bold text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
          style={{ backgroundColor: isShiro ? "#6366f1" : "#ec4899" }}
        >
          もういちど！
        </button>
        <button
          onClick={() =>
            router.push(
              `/select?account=${encodeURIComponent(accountName)}`
            )
          }
          className="px-10 py-4 rounded-2xl text-xl font-bold text-gray-600 bg-white border-2 border-gray-300 shadow-lg hover:shadow-xl active:scale-95 transition-all"
        >
          もどる
        </button>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-2xl text-gray-400">よみこみちゅう...</div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
