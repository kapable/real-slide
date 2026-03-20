"use client";

interface SlideProps {
  title?: string;
  content?: string;
  type?: "slide" | "vote" | "quiz";
  options?: string[];
}

export function SlidePresentation({
  title,
  content,
  type = "slide",
  options = [],
}: SlideProps) {
  return (
    <div className="w-full h-full bg-white rounded-lg shadow-lg p-8 flex flex-col justify-center items-center">
      {title && (
        <h1 className="text-5xl font-bold text-gray-800 mb-8 text-center">
          {title}
        </h1>
      )}
      {content && (
        <div className="text-xl text-gray-600 text-center whitespace-pre-wrap max-w-2xl mb-8">
          {content}
        </div>
      )}

      {/* 투표/퀴즈 옵션 표시 */}
      {(type === "vote" || type === "quiz") && options.length > 0 && (
        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
          {options.map((option, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg font-semibold text-center ${
                type === "vote"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-purple-100 text-purple-800"
              }`}
            >
              {option}
            </div>
          ))}
        </div>
      )}

      {!title && !content && !options.length && (
        <div className="text-2xl text-gray-400">슬라이드를 추가해주세요</div>
      )}
    </div>
  );
}
