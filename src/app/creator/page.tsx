"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreatorPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("프레젠테이션 제목을 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("세션 생성 실패");
      }

      const { sessionId } = await response.json();
      router.push(`/session/${sessionId}/presenter`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* 상단 네비게이션 */}
        <div className="flex justify-between items-center mb-12">
          <Link
            href="/"
            className="text-white text-lg font-bold hover:opacity-80"
          >
            ← Real-Slide
          </Link>
        </div>

        {/* 메인 카드 */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">발표 시작</h1>
          <p className="text-gray-600 mb-8">
            새로운 프레젠테이션을 생성하고 청중과 상호작용하세요.
          </p>

          <form onSubmit={handleCreateSession} className="space-y-6">
            {/* 제목 입력 */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                프레젠테이션 제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 2024년 Q1 분기 실적 발표"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            {/* 에러 표시 */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              {isLoading ? "생성 중..." : "발표 시작"}
            </button>
          </form>

          {/* 팁 섹션 */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-gray-700 font-semibold mb-4">💡 팁</h3>
            <ul className="text-gray-600 text-sm space-y-2">
              <li>• 발표를 시작하면 고유한 세션 링크가 생성됩니다.</li>
              <li>• 그 링크를 청중과 공유하면 누구나 참여할 수 있습니다.</li>
              <li>• 발표 중 슬라이드, 투표, 댓글 등을 관리할 수 있습니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
