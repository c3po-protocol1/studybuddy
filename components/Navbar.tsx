"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-indigo-600 text-lg">
        StudyBuddy
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{session.user?.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-1 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
