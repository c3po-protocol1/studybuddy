"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CreateSpaceModal from "@/components/CreateSpaceModal";

interface Space {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: string;
  _count: { materials: number };
}

export default function Home() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSpaces = async () => {
    const res = await fetch("/api/spaces");
    const data = await res.json();
    setSpaces(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleCreated = () => {
    setShowModal(false);
    fetchSpaces();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              S
            </div>
            <h1 className="text-xl font-bold text-gray-900">StudyBuddy</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            새 스터디 공간
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">내 스터디 공간</h2>
          <p className="text-gray-500">AI가 학습 자료를 분석하고 맞춤형 문제를 제공합니다.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">아직 스터디 공간이 없어요</h3>
            <p className="text-gray-400 mb-6">새 스터디 공간을 만들어 학습을 시작해보세요!</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              첫 스터디 공간 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {spaces.map((space) => (
              <Link key={space.id} href={`/spaces/${space.id}`}>
                <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: space.color + "20" }}
                  >
                    {space.emoji}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">{space.name}</h3>
                  <p className="text-sm text-gray-400">자료 {space._count.materials}개</p>
                  <div
                    className="mt-4 h-1 rounded-full"
                    style={{ backgroundColor: space.color + "40" }}
                  />
                </div>
              </Link>
            ))}
            <button
              onClick={() => setShowModal(true)}
              className="bg-white rounded-2xl p-6 border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-indigo-500 min-h-[180px]"
            >
              <div className="text-4xl">+</div>
              <span className="text-sm font-medium">새 스터디 공간</span>
            </button>
          </div>
        )}
      </main>

      {showModal && (
        <CreateSpaceModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
