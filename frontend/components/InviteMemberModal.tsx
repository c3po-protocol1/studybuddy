"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";

interface Props {
  groupId: string;
  onClose: () => void;
  onInvited: () => void;
}

export default function InviteMemberModal({ groupId, onClose, onInvited }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiClient.post(`/api/groups/${groupId}/invite`, { email });
      onInvited();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "초대에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">멤버 초대</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
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
            >
              {loading ? "초대 중..." : "초대하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
