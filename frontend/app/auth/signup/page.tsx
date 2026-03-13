"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, login } from "@/lib/auth-store";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(email, password, name || undefined);
      // Auto-login after registration
      try {
        await login(email, password);
      } catch {
        // If auto-login fails, redirect to signin
        router.push("/auth/signin");
        return;
      }
      router.push("/");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "회원가입에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">회원가입</h1>
        <p className="text-gray-500 text-sm mb-6">무료로 시작하세요</p>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="signup-form">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름 (선택)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="홍길동"
              data-testid="signup-name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
              data-testid="signup-email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="8자 이상"
              data-testid="signup-password"
            />
          </div>

          {error && <p className="text-red-500 text-sm" data-testid="signup-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
            data-testid="signup-submit"
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/signin" className="text-indigo-600 hover:underline font-medium" data-testid="signup-signin-link">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
