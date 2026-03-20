"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!sessionCode.trim()) {
      setError("세션 코드를 입력해주세요.");
      return;
    }

    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      // 세션 코드가 유효한지 확인
      const response = await fetch(
        `/api/sessions/validate/${sessionCode.toUpperCase()}`,
      );

      if (!response.ok) {
        throw new Error("존재하지 않는 세션이거나 진행 중이 아닙니다.");
      }

      const { sessionId } = await response.json();

      // 닉네임과 함께 참여 페이지로 이동
      router.push(
        `/join/${sessionId}?nickname=${encodeURIComponent(nickname)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600">
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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">세션 참여</h1>
          <p className="text-gray-600 mb-8">
            발표자가 제공한 코드를 입력하여 세션에 참여하세요.
          </p>

          <form onSubmit={handleJoin} className="space-y-6">
            {/* 세션 코드 입력 */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                세션 코드
              </label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="예: ABC123"
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest font-mono"
                disabled={isLoading}
              />
            </div>

            {/* 닉네임 입력 */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="예: John, 김지은"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              {isLoading ? "참여 중..." : "참여"}
            </button>
          </form>

          {/* 팁 섹션 */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-gray-700 font-semibold mb-4">💡 팁</h3>
            <ul className="text-gray-600 text-sm space-y-2">
              <li>• 세션 코드는 발표자가 알려줄 것입니다.</li>
              <li>• 닉네임은 변경할 수 없으므로 신중하게 입력하세요.</li>
              <li>• 참여하면 실시간으로 발표자의 슬라이드를 볼 수 있습니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
