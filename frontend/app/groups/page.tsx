"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CreateGroupModal from "@/components/CreateGroupModal";
import { apiClient } from "@/lib/api-client";

interface StudyGroup {
  id: string;
  name: string;
  emoji: string;
  description: string;
  ownerId: string;
  memberCount: number;
  createdAt: string;
}

export default function GroupListPage() {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    try {
      const data = await apiClient.get("/api/groups");
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreated = () => {
    setShowModal(false);
    fetchGroups();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              G
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">스터디 그룹</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <span className="text-lg leading-none">+</span>
            새 그룹
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">내 스터디 그룹</h2>
          <p className="text-gray-500 dark:text-gray-400">함께 공부하는 친구들과 스터디 공간을 공유하세요.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">아직 스터디 그룹이 없어요</h3>
            <p className="text-gray-400 dark:text-gray-500 mb-6">새 그룹을 만들어 친구들과 함께 공부해보세요!</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
            >
              첫 스터디 그룹 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-2xl">
                      {group.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg truncate">{group.name}</h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500">멤버 {group.memberCount}명</p>
                    </div>
                  </div>
                  {group.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{group.description}</p>
                  )}
                </div>
              </Link>
            ))}
            <button
              onClick={() => setShowModal(true)}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500 hover:text-indigo-500 min-h-[140px]"
            >
              <div className="text-4xl">+</div>
              <span className="text-sm font-medium">새 그룹 만들기</span>
            </button>
          </div>
        )}
      </main>

      {showModal && (
        <CreateGroupModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
