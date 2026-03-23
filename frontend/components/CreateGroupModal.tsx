"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";

const EMOJI_OPTIONS = ["📖", "🧮", "🔬", "🌍", "💡", "🎯", "📝", "🏫", "🎨", "🧠", "💻", "🎵"];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateGroupModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📖");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/api/groups", { name, emoji, description });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" data-testid="create-group-modal">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">새 스터디 그룹 만들기</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-indigo-100 dark:bg-indigo-800">
              {emoji}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{name || "그룹 이름"}</p>
              <p className="text-sm text-gray-400">{description || "설명을 입력하세요"}</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 수학 스터디, 영어 회화 모임"
              data-testid="group-name-input"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="그룹에 대한 간단한 설명"
              data-testid="group-description-input"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={2}
              maxLength={200}
            />
          </div>

          {/* Emoji picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">이모지</label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-2xl p-2 rounded-xl transition-all ${
                    emoji === e ? "bg-indigo-100 dark:bg-indigo-800 ring-2 ring-indigo-500" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]"
              data-testid="create-group-submit"
            >
              {loading ? "만드는 중..." : "만들기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
