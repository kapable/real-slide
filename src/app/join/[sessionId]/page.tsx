"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Slide } from "@/types";
import { SlidePresentation } from "@/components/SlidePresentation";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";

export default function JoinSessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const nickname = searchParams.get("nickname") || "익명";

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [participantId, setParticipantId] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Initialize participant and fetch slides
  useEffect(() => {
    const initialize = async () => {
      try {
        // Add participant
        const response = await fetch("/api/participants/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, nickname }),
        });

        if (!response.ok) throw new Error("참여 실패");

        const { participantId: pId } = await response.json();
        setParticipantId(pId);

        // Fetch slides
        const slidesResponse = await fetch(`/api/slides/${sessionId}`);

        if (!slidesResponse.ok) {
          throw new Error(`슬라이드 로드 실패: ${slidesResponse.status}`);
        }

        const slidesData = await slidesResponse.json();

        if (!Array.isArray(slidesData)) {
          throw new Error("잘못된 슬라이드 응답 형식입니다");
        }

        setSlides(slidesData);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "오류 발생";
        setError(errorMsg);
        console.error("초기화 에러:", err);
        // 에러 발생 시 빈 배열로 초기화
        setSlides([]);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [sessionId, nickname]);

  // Subscribe to realtime changes
  useRealtimeChannel(`session-${sessionId}`, {
    onBroadcast: (payload) => {
      if (payload.event === "slide:change") {
        setCurrentSlideIndex(payload.slideIndex);
        setHasVoted(false);
      }
    },
  });

  const handleVote = async (optionIndex: number) => {
    if (!participantId || hasVoted) return;

    try {
      const response = await fetch("/api/votes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId: slides[currentSlideIndex].id,
          participantId,
          optionIndex,
        }),
      });

      if (!response.ok) throw new Error("투표 실패");

      setHasVoted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 mb-2">
            참여 중입니다...
          </div>
          <div className="text-gray-600">
            발표자의 슬라이드를 기다리고 있습니다.
          </div>
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {nickname}님 환영합니다
            </h1>
          </div>
          <div className="text-sm text-gray-600">
            슬라이드{" "}
            {slides.length > 0
              ? `${currentSlideIndex + 1}/${slides.length}`
              : "0/0"}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 큰 슬라이드 뷰 */}
        <div
          className="bg-white rounded-lg shadow p-6 mb-4"
          style={{ aspectRatio: "16/9" }}
        >
          {currentSlide ? (
            <SlidePresentation
              title={currentSlide.title}
              content={currentSlide.content}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              슬라이드를 기다리는 중입니다...
            </div>
          )}
        </div>

        {/* 투표 인터페이스 */}
        {currentSlide &&
          currentSlide.type === "vote" &&
          currentSlide.options && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {currentSlide.title}
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {JSON.parse(currentSlide.options as string).map(
                  (option: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleVote(index)}
                      disabled={hasVoted}
                      className={`p-4 rounded-lg font-semibold text-lg transition ${
                        hasVoted
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      {option}
                    </button>
                  ),
                )}
              </div>
              {hasVoted && (
                <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  ✓ 투표가 완료되었습니다
                </div>
              )}
            </div>
          )}

        {/* 퀴즈 인터페이스 */}
        {currentSlide &&
          currentSlide.type === "quiz" &&
          currentSlide.options && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {currentSlide.title}
              </h2>
              <p className="text-gray-600 mb-6">{currentSlide.content}</p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {JSON.parse(currentSlide.options as string).map(
                  (option: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleVote(index)}
                      disabled={hasVoted}
                      className={`p-4 rounded-lg font-semibold text-lg transition ${
                        hasVoted
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-purple-500 text-white hover:bg-purple-600"
                      }`}
                    >
                      {option}
                    </button>
                  ),
                )}
              </div>
              {hasVoted && (
                <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  ✓ 답변이 제출되었습니다
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
