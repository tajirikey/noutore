"use client";

import { useRouter } from "next/navigation";
import { AccountName } from "@/types";

export default function Home() {
  const router = useRouter();

  const selectAccount = (name: AccountName) => {
    router.push(`/select?account=${encodeURIComponent(name)}`);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-6xl font-extrabold text-indigo-600 mb-4">
        のうトレ！
      </h1>
      <p className="text-xl text-gray-500 mb-16">けいさんトレーニング</p>

      <p className="text-2xl text-gray-700 mb-8 font-bold">
        だれがつかう？
      </p>

      <div className="flex gap-8">
        <button
          onClick={() => selectAccount("しろ")}
          className="w-44 h-44 rounded-3xl bg-white border-4 border-indigo-300 shadow-lg hover:shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center gap-3"
        >
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-4xl">👦</span>
          </div>
          <span className="text-3xl font-bold text-indigo-700">しろ</span>
        </button>

        <button
          onClick={() => selectAccount("かわ")}
          className="w-44 h-44 rounded-3xl bg-white border-4 border-pink-300 shadow-lg hover:shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center gap-3"
        >
          <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center">
            <span className="text-4xl">👧</span>
          </div>
          <span className="text-3xl font-bold text-pink-700">かわ</span>
        </button>
      </div>
    </main>
  );
}
