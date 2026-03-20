"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Slide } from "@/types";
import { SlidePresentation } from "@/components/SlidePresentation";
import { VoteChart } from "@/components/VoteChart";
import HandsUpPanel from "@/components/HandsUpPanel";
import CommentSection from "@/components/CommentSection";
import WordcloudDisplay from "@/components/WordcloudDisplay";
import { supabase } from "@/lib/supabase";

export default function PresenterPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [shareCode, setShareCode] = useState("");
  const [newSlideTitle, setNewSlideTitle] = useState("");
  const [newSlideContent, setNewSlideContent] = useState("");
  const [slideType, setSlideType] = useState("slide");
  const [options, setOptions] = useState(["옵션 1", "옵션 2", "옵션 3"]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [votes, setVotes] = useState<Record<number, number>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const channelRef = useRef<any>(null);

  // Fetch slides on mount
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch(`/api/slides/${sessionId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API error details:", errorData);
          throw new Error(
            `Failed to load slides: ${response.status} - ${errorData.error || ""}`,
          );
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid response format");
        }

        setSlides(data);

        // Get session details to show share code
        const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
        if (!sessionResponse.ok) {
          throw new Error(`Failed to load session: ${sessionResponse.status}`);
        }

        const sessionData = await sessionResponse.json();
        setShareCode(sessionData.share_code);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load slides";
        setError(errorMsg);
        console.error("Load error:", err);
        setSlides([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlides();
  }, [sessionId]);

  // Update vote/quiz chart
  const updateVoteChart = useCallback(async (slideId: string, type: string) => {
    try {
      const endpoint = type === "quiz" ? `/api/quiz/${slideId}` : `/api/votes/${slideId}`;
      const response = await fetch(endpoint);
      if (!response.ok) return;

      const results = await response.json();
      const counts: Record<number, number> = {};
      results.forEach((item: any) => {
        const index = type === "quiz" ? item.answer_index : item.option_index;
        const count = counts[index] || 0;
        counts[index] = count + 1;
      });

      setVotes(counts);
    } catch (err) {
      console.error("Failed to update voting/quiz data:", err);
    }
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "broadcast",
        { event: "slide:change" },
        (payload: { payload: { slideIndex: number } }) => {
          setCurrentSlideIndex(payload.payload.slideIndex);
          setVotes({});
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
        },
        (payload: { new: { slide_id: string } }) => {
          // Only update if it's for current slide
          const currentSlide = slides[currentSlideIndex];
          if (currentSlide && currentSlide.type === "vote" && payload.new?.slide_id === currentSlide.id) {
            updateVoteChart(currentSlide.id, "vote");
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quiz_answers",
        },
        (payload: { new: { slide_id: string } }) => {
          // Only update if it's for current slide
          const currentSlide = slides[currentSlideIndex];
          if (currentSlide && currentSlide.type === "quiz" && payload.new?.slide_id === currentSlide.id) {
            updateVoteChart(currentSlide.id, "quiz");
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, slides, currentSlideIndex, updateVoteChart]);

  // Load vote/quiz data when slide changes
  useEffect(() => {
    const currentSlide = slides[currentSlideIndex];
    if (currentSlide && (currentSlide.type === "vote" || currentSlide.type === "quiz")) {
      updateVoteChart(currentSlide.id, currentSlide.type);
    }
  }, [currentSlideIndex, slides, updateVoteChart]);

  const handleAddSlide = async () => {
    if (!newSlideTitle.trim()) {
      setError("Please enter a slide title");
      return;
    }

    try {
      const slideData = {
        type: slideType,
        title: newSlideTitle,
        content: newSlideContent,
        options: slideType === "slide" ? null : options,
        correctAnswer: slideType === "quiz" ? correctAnswer : null,
      };

      const response = await fetch(`/api/slides/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slideData),
      });

      if (!response.ok) throw new Error("Failed to add slide");

      const newSlide = await response.json();
      setSlides([...slides, newSlide]);
      setNewSlideTitle("");
      setNewSlideContent("");
      setOptions(["옵션 1", "옵션 2", "옵션 3"]);
      setCorrectAnswer(0);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error occurred");
    }
  };

  const handleNextSlide = () => {
    const nextIndex = Math.min(currentSlideIndex + 1, slides.length - 1);
    setCurrentSlideIndex(nextIndex);

    // Broadcast to all participants
    channelRef.current?.send({
      type: "broadcast",
      event: "slide:change",
      payload: {
        event: "slide:change",
        slideIndex: nextIndex,
      },
    });

    setVotes({});
    if (slides[nextIndex]) {
      updateVoteChart(slides[nextIndex].id, slides[nextIndex].type);
    }
  };

  const handlePrevSlide = () => {
    const prevIndex = Math.max(currentSlideIndex - 1, 0);
    setCurrentSlideIndex(prevIndex);

    // Broadcast to all participants
    channelRef.current?.send({
      type: "broadcast",
      event: "slide:change",
      payload: {
        event: "slide:change",
        slideIndex: prevIndex,
      },
    });

    setVotes({});
    if (slides[prevIndex]) {
      updateVoteChart(slides[prevIndex].id, slides[prevIndex].type);
    }
  };

  const currentSlide = slides[currentSlideIndex];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Presenter Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Session Code:{" "}
              <span className="font-mono font-bold text-blue-600">
                {shareCode}
              </span>
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
          {/* Left Panel: Add/List Slides (2 columns) */}
          <div className="col-span-2 bg-white rounded-lg shadow p-4 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              슬라이드 추가
            </h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Slide Type Select */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  슬라이드 타입
                </label>
                <select
                  value={slideType}
                  onChange={(e) => setSlideType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="slide">일반 슬라이드</option>
                  <option value="vote">투표</option>
                  <option value="quiz">퀴즈</option>
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={newSlideTitle}
                  onChange={(e) => setNewSlideTitle(e.target.value)}
                  placeholder="슬라이드 제목"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              {/* Content Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  콘텐츠
                </label>
                <textarea
                  value={newSlideContent}
                  onChange={(e) => setNewSlideContent(e.target.value)}
                  placeholder="슬라이드 내용"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>

              {/* Vote/Quiz Options */}
              {slideType !== "slide" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    선택지 (엔터로 구분)
                  </label>
                  <textarea
                    value={options.join("\n")}
                    onChange={(e) => setOptions(e.target.value.split("\n"))}
                    placeholder="선택지 1&#10;선택지 2&#10;선택지 3"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {/* Quiz Correct Answer */}
              {slideType === "quiz" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    정답 (선택지 인덱스: 0부터 시작)
                  </label>
                  <select
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    {options.map((_, index) => (
                      <option key={index} value={index}>
                        {index + 1}번 선택지
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleAddSlide}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded"
              >
                슬라이드 추가
              </button>
            </div>

            {/* Slide List */}
            <div className="mt-6 border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                슬라이드 목록
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`w-full p-2 text-left rounded text-sm transition ${
                      index === currentSlideIndex
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    <div className="font-semibold">
                      {index + 1}. {slide.title || "(제목 없음)"}
                    </div>
                    <div className="text-xs opacity-75">
                      {slide.type === "slide"
                        ? "슬라이드"
                        : slide.type === "vote"
                          ? "투표"
                          : "퀴즈"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Large Slide View (5 columns) */}
          <div className="col-span-5 flex flex-col gap-4 overflow-y-auto">
            <div
              className="bg-white rounded-lg shadow p-6 flex-shrink-0"
              style={{ aspectRatio: "16/9" }}
            >
              {currentSlide ? (
                <SlidePresentation
                  title={currentSlide.title}
                  content={currentSlide.content}
                  type={currentSlide.type}
                  options={
                    currentSlide.options
                      ? JSON.parse(currentSlide.options as string)
                      : []
                  }
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  슬라이드를 추가하여 시작하세요
                </div>
              )}
            </div>

            {/* Slide Navigation */}
            <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center flex-shrink-0">
              <button
                onClick={handlePrevSlide}
                disabled={currentSlideIndex === 0}
                className="px-4 py-2 bg-gray-300 disabled:bg-gray-200 text-gray-800 rounded hover:bg-gray-400 transition"
              >
                ← 이전
              </button>
              <span className="text-gray-700 font-semibold">
                {slides.length > 0
                  ? `${currentSlideIndex + 1} / ${slides.length}`
                  : "슬라이드 없음"}
              </span>
              <button
                onClick={handleNextSlide}
                disabled={currentSlideIndex >= slides.length - 1}
                className="px-4 py-2 bg-blue-500 disabled:bg-gray-200 text-white rounded hover:bg-blue-600 transition"
              >
                다음 →
              </button>
            </div>

            {/* Vote/Quiz Chart */}
            {currentSlide &&
              (currentSlide.type === "vote" || currentSlide.type === "quiz") &&
              currentSlide.options && (
                <div className="bg-white rounded-lg shadow p-4 flex-shrink-0">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    {currentSlide.type === "vote" ? "투표 결과" : "퀴즈 실시간 현황"}
                  </h3>
                  <VoteChart
                    votes={votes}
                    options={JSON.parse(currentSlide.options as string)}
                    type="bar"
                    correctAnswer={currentSlide.type === "quiz" ? currentSlide.correct_answer : undefined}
                  />
                </div>
              )}

            {/* Wordcloud Display */}
            {currentSlide && (
              <div className="bg-white rounded-lg shadow p-4 flex-shrink-0">
                <WordcloudDisplay slideId={currentSlide.id} maxWords={50} />
              </div>
            )}
          </div>

          {/* Right Panel: Hands Up + Comments (5 columns) */}
          <div className="col-span-5 flex flex-col gap-4 overflow-y-auto">
            {/* Hands Up Panel */}
            <div className="flex-shrink-0">
              <HandsUpPanel sessionId={sessionId} />
            </div>

            {/* Comments Section */}
            {currentSlide && (
              <div className="flex-1 min-h-0">
                <CommentSection
                  slideId={currentSlide.id}
                  participantId="presenter"
                  nickname="발표자"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
