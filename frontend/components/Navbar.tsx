"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser, logout } from "@/lib/auth-store";
import type { AuthUser } from "@/lib/auth-store";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  if (!user) return null;

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
          StudyBuddy
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3" data-testid="desktop-nav">
          <Link
            href="/groups"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 transition-colors"
          >
            그룹
          </Link>
          <span className="text-sm text-gray-600 dark:text-gray-400">{user.email}</span>
          <Link
            href="/settings"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 transition-colors"
          >
            설정
          </Link>
          <ThemeToggle />
          <button
            onClick={() => logout()}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="메뉴"
            data-testid="mobile-menu-toggle"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2" data-testid="mobile-menu">
          <p className="text-sm text-gray-600 dark:text-gray-400 px-2">{user.email}</p>
          <Link
            href="/groups"
            onClick={() => setMenuOpen(false)}
            className="block text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors"
          >
            그룹
          </Link>
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="block text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors"
          >
            설정
          </Link>
          <button
            onClick={() => logout()}
            className="w-full text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}
