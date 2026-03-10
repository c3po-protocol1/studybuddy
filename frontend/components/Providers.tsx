"use client";

// Providers wrapper - NextAuth SessionProvider removed in favor of custom JWT auth
export default function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
