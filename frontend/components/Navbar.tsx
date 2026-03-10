"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser, logout } from "@/lib/auth-store";
import type { AuthUser } from "@/lib/auth-store";

export default function Navbar() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-indigo-600 text-lg">
        StudyBuddy
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{user.email}</span>
        <Link
          href="/settings"
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-1 transition-colors"
        >
          설정
        </Link>
        <button
          onClick={() => logout()}
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-1 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
