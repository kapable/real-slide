"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Slide } from "@/types";
import { SlidePresentation } from "@/components/SlidePresentation";
import { VoteChart } from "@/components/VoteChart";
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

  // Update vote chart
  const updateVoteChart = useCallback(async (slideId: string) => {
    try {
      const response = await fetch(`/api/votes/${slideId}`);
      if (!response.ok) return;

      const slideVotes = await response.json();
      const voteCounts: Record<number, number> = {};
      slideVotes.forEach((vote: any) => {
        const count = voteCounts[vote.option_index] || 0;
        voteCounts[vote.option_index] = count + 1;
      });

      setVotes(voteCounts);
    } catch (err) {
      console.error("Failed to update voting data:", err);
    }
  }, []);

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on("broadcast", { event: "slide:change" }, (payload) => {
        setCurrentSlideIndex(payload.payload.slideIndex);
        setVotes({});
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
        },
        (payload) => {
          // Only update if it's for current slide
          const currentSlide = slides[currentSlideIndex];
          if (currentSlide && payload.new?.slide_id === currentSlide.id) {
            updateVoteChart(currentSlide.id);
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, slides, currentSlideIndex, updateVoteChart]);

  // Load vote data when slide changes
  useEffect(() => {
    const currentSlide = slides[currentSlideIndex];
    if (currentSlide && currentSlide.type === "vote") {
      updateVoteChart(currentSlide.id);
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
      updateVoteChart(slides[nextIndex].id);
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
      updateVoteChart(slides[prevIndex].id);
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
        <div className="grid grid-cols-3 gap-4">
          {/* Left: Add Slide Panel */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Slide</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Slide Type Select */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Slide Type
                </label>
                <select
                  value={slideType}
                  onChange={(e) => setSlideType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="slide">Regular Slide</option>
                  <option value="vote">Poll</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newSlideTitle}
                  onChange={(e) => setNewSlideTitle(e.target.value)}
                  placeholder="Slide title"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              {/* Content Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={newSlideContent}
                  onChange={(e) => setNewSlideContent(e.target.value)}
                  placeholder="Slide content"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              {/* Vote/Quiz Options */}
              {slideType !== "slide" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Options (separate by line breaks)
                  </label>
                  <textarea
                    value={options.join("\n")}
                    onChange={(e) => setOptions(e.target.value.split("\n"))}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              <button
                onClick={handleAddSlide}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded"
              >
                Add Slide
              </button>
            </div>

            {/* Slide List */}
            <div className="mt-6 border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-3">Slide List</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`w-full p-2 text-left rounded text-sm ${
                      index === currentSlideIndex
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    <div className="font-semibold">
                      {index + 1}. {slide.title || "(No title)"}
                    </div>
                    <div className="text-xs opacity-75">
                      {slide.type === "slide"
                        ? "Slide"
                        : slide.type === "vote"
                          ? "Poll"
                          : "Quiz"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Large Slide View */}
          <div className="col-span-2">
            <div
              className="bg-white rounded-lg shadow p-6 mb-4"
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
                  Add a slide to get started
                </div>
              )}
            </div>

            {/* Slide Navigation */}
            <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center mb-4">
              <button
                onClick={handlePrevSlide}
                disabled={currentSlideIndex === 0}
                className="px-4 py-2 bg-gray-300 disabled:bg-gray-200 text-gray-800 rounded hover:bg-gray-400"
              >
                ← Previous
              </button>
              <span className="text-gray-700 font-semibold">
                {slides.length > 0
                  ? `${currentSlideIndex + 1} / ${slides.length}`
                  : "No slides"}
              </span>
              <button
                onClick={handleNextSlide}
                disabled={currentSlideIndex >= slides.length - 1}
                className="px-4 py-2 bg-blue-500 disabled:bg-gray-200 text-white rounded hover:bg-blue-600"
              >
                Next →
              </button>
            </div>

            {/* Vote/Quiz Chart */}
            {currentSlide &&
              currentSlide.type === "vote" &&
              currentSlide.options && (
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Poll Results
                  </h3>
                  <VoteChart
                    votes={votes}
                    options={JSON.parse(currentSlide.options as string)}
                    type="bar"
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
