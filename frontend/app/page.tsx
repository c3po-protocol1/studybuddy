"use client";

import { useState, useEffect } from "react";
import CreateSpaceModal from "@/components/CreateSpaceModal";
import SpaceGrid from "@/components/SpaceGrid";
import { apiClient } from "@/lib/api-client";

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
    try {
      const data = await apiClient.get("/api/spaces");
      setSpaces(Array.isArray(data) ? data : []);
    } catch {
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleCreated = () => {
    setShowModal(false);
    fetchSpaces();
  };

  const handleReorder = async (orderedIds: string[]) => {
    try {
      await apiClient.put("/api/spaces/reorder", { orderedIds });
    } catch {
      // Silently fail — local state already updated
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              S
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">StudyBuddy</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <span className="text-lg leading-none">+</span>
            새 스터디 공간
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">내 스터디 공간</h2>
          <p className="text-gray-500 dark:text-gray-400">AI가 학습 자료를 분석하고 맞춤형 문제를 제공합니다.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">아직 스터디 공간이 없어요</h3>
            <p className="text-gray-400 dark:text-gray-500 mb-6">새 스터디 공간을 만들어 학습을 시작해보세요!</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
            >
              첫 스터디 공간 만들기
            </button>
          </div>
        ) : (
          <SpaceGrid
            spaces={spaces}
            onReorder={handleReorder}
            onCreateClick={() => setShowModal(true)}
          />
        )}
      </main>

      {showModal && (
        <CreateSpaceModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
