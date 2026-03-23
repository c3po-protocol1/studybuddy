"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

const LLM_MODELS = [
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (Fast)" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Balanced)" },
  { value: "claude-opus-4-5", label: "Claude Opus 4 (Most Capable)" },
];

interface Settings {
  anthropicApiKey: string;
  llmModel: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    anthropicApiKey: "",
    llmModel: "claude-3-5-haiku-20241022",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get("/api/settings")
      .then((data: Settings) => {
        setSettings({
          anthropicApiKey: data.anthropicApiKey || "",
          llmModel: data.llmModel || "claude-3-5-haiku-20241022",
        });
      })
      .catch(() => {
        // Keep defaults on error
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await apiClient.put("/api/settings", settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            S
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">설정</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center h-60">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">AI 모델 설정</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Anthropic Claude API 설정을 관리합니다.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Anthropic API Key
              </label>
              <input
                type="password"
                value={settings.anthropicApiKey}
                onChange={(e) => setSettings((s) => ({ ...s, anthropicApiKey: e.target.value }))}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Anthropic 콘솔에서 발급받은 API 키를 입력하세요.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">LLM 모델</label>
              <select
                value={settings.llmModel}
                onChange={(e) => setSettings((s) => ({ ...s, llmModel: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700"
              >
                {LLM_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {saved && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-400">
                설정이 저장되었습니다.
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              {saving ? "저장 중..." : "설정 저장"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
