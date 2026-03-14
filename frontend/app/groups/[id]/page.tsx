"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import InviteMemberModal from "@/components/InviteMemberModal";
import { apiClient } from "@/lib/api-client";
import { getUser } from "@/lib/auth-store";

interface Member {
  id: string;
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface Space {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface GroupDetail {
  id: string;
  name: string;
  emoji: string;
  description: string;
  ownerId: string;
  members: Member[];
  spaces: Space[];
  memberCount: number;
}

function MemberAvatar({ email, role }: { email: string; role: string }) {
  const initials = email ? email.charAt(0).toUpperCase() : "?";
  const bgColor = role === "owner" ? "bg-indigo-600" : role === "pending" ? "bg-gray-400" : "bg-emerald-500";

  return (
    <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center text-white font-medium text-sm min-w-[40px]`}>
      {initials}
    </div>
  );
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const currentUser = getUser();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const data = await apiClient.get(`/api/groups/${groupId}`);
      setGroup(data);
    } catch {
      router.push("/groups");
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("이 멤버를 제거하시겠습니까?")) return;
    try {
      await apiClient.delete(`/api/groups/${groupId}/members/${userId}`);
      fetchGroup();
    } catch {
      // ignore
    }
  };

  const handleInvited = () => {
    setShowInvite(false);
    fetchGroup();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!group) return null;

  const isOwner = currentUser?.id === group.ownerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/groups" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-sm">
            ← 그룹 목록
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-xl">
            {group.emoji}
          </div>
          <h1 className="font-semibold text-gray-900 dark:text-gray-100">{group.name}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Group info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8" data-testid="group-header">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-4xl">
              {group.emoji}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{group.name}</h2>
              {group.description && (
                <p className="text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              멤버 ({(group.members ?? []).filter((m) => m.role !== "pending").length})
            </h3>
            {isOwner && (
              <button
                onClick={() => setShowInvite(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
                data-testid="invite-member-btn"
              >
                멤버 초대
              </button>
            )}
          </div>
          <div className="space-y-3" data-testid="member-list">
            {(group.members ?? []).map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <MemberAvatar email={member.email} role={member.role} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{member.email}</p>
                  <p className="text-xs text-gray-400">
                    {member.role === "owner" ? "소유자" : member.role === "pending" ? "대기 중" : "멤버"}
                  </p>
                </div>
                {isOwner && member.userId !== currentUser?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-sm p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="제거"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Shared spaces */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            공유된 공간 ({(group.spaces ?? []).length})
          </h3>
          {(group.spaces ?? []).length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">아직 공유된 공간이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(group.spaces ?? []).map((space) => (
                <Link key={space.id} href={`/spaces/${space.id}`}>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: space.color + "20" }}
                    >
                      {space.emoji}
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{space.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {showInvite && (
        <InviteMemberModal
          groupId={groupId}
          onClose={() => setShowInvite(false)}
          onInvited={handleInvited}
        />
      )}
    </div>
  );
}
