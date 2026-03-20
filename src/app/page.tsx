import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Real-Slide
        </h1>
        <p className="text-gray-600 text-center mb-8">
          실시간 대화형 프레젠테이션 플랫폼
        </p>

        <div className="space-y-4">
          <Link
            href="/creator"
            className="w-full block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-center transition"
          >
            발표 시작
          </Link>

          <Link
            href="/join"
            className="w-full block bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg text-center transition"
          >
            세션 참여
          </Link>
        </div>
      </div>
    </div>
  );
}
