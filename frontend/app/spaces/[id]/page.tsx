"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import FileUploader from "@/components/FileUploader";
import SummaryTab from "@/components/SummaryTab";
import KeyPointsTab from "@/components/KeyPointsTab";
import PracticeTab from "@/components/PracticeTab";
import { apiClient } from "@/lib/api-client";

type TabType = "summary" | "keypoints" | "practice";

interface Material {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
  summary?: { content: string } | null;
  keyPoints?: { points: string } | null;
  _count?: { questions: number };
}

interface Space {
  id: string;
  name: string;
  emoji: string;
  color: string;
  materials: Material[];
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "대기", className: "bg-gray-100 text-gray-500" },
  processing: { label: "분석중", className: "bg-yellow-100 text-yellow-700 animate-pulse" },
  done: { label: "완료", className: "bg-green-100 text-green-700" },
  error: { label: "오류", className: "bg-red-100 text-red-600" },
};

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;

  const [space, setSpace] = useState<Space | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());

  const fetchSpace = useCallback(async () => {
    try {
      const data = await apiClient.get(`/api/spaces/${spaceId}`);
      setSpace(data);
      setLoading(false);
    } catch {
      router.push("/");
    }
  }, [spaceId, router]);

  useEffect(() => {
    fetchSpace();
  }, [fetchSpace]);

  // Auto-select first material
  useEffect(() => {
    if (space?.materials?.length && !selectedMaterialId) {
      setSelectedMaterialId(space.materials?.[0]?.id ?? null);
    }
  }, [space, selectedMaterialId]);

  // Poll for processing materials
  useEffect(() => {
    if (!space) return;
    const processing = (space.materials ?? []).filter((m) => m.status === "processing");
    if (processing.length === 0) return;

    const newPolling = new Set(processing.map((m) => m.id));
    if ([...newPolling].every((id) => pollingIds.has(id))) return;
    setPollingIds(newPolling);

    const interval = setInterval(() => {
      fetchSpace();
    }, 3000);
    return () => clearInterval(interval);
  }, [space, pollingIds, fetchSpace]);

  const handleUploadComplete = (materialId: string) => {
    setShowUploader(false);
    setSelectedMaterialId(materialId);
    fetchSpace();
  };

  const handleDeleteMaterial = async (materialId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 자료를 삭제하시겠습니까?")) return;
    try {
      await apiClient.delete(`/api/materials/${materialId}`);
    } catch {
      // ignore
    }
    if (selectedMaterialId === materialId) setSelectedMaterialId(null);
    fetchSpace();
  };

  const selectedMaterial = space?.materials?.find((m) => m.id === selectedMaterialId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!space) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3 px-5 py-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
            ← 홈
          </Link>
          <span className="text-gray-300">/</span>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: space.color + "25" }}
          >
            {space.emoji}
          </div>
          <h1 className="font-semibold text-gray-900">{space.name}</h1>
          <span className="ml-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            자료 {space.materials?.length ?? 0}개
          </span>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <button
              onClick={() => setShowUploader((v) => !v)}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="text-base leading-none">+</span>
              자료 업로드
            </button>
          </div>

          {showUploader && (
            <div className="p-3 border-b border-gray-100">
              <FileUploader spaceId={spaceId} onUploadComplete={handleUploadComplete} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {(space.materials?.length ?? 0) === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">자료가 없습니다.</p>
            ) : (
              (space.materials ?? []).map((mat) => {
                const statusInfo = STATUS_LABEL[mat.status] ?? STATUS_LABEL.pending;
                return (
                  <button
                    key={mat.id}
                    onClick={() => setSelectedMaterialId(mat.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all group relative ${
                      selectedMaterialId === mat.id
                        ? "bg-indigo-50 border border-indigo-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base mt-0.5">
                        {mat.filename.endsWith(".pdf") ? "📄" : "📝"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{mat.filename}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                          {mat._count && mat._count.questions > 0 && (
                            <span className="text-[10px] text-gray-400">
                              문제 {mat._count.questions}개
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteMaterial(mat.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-sm leading-none p-1"
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex px-6">
              {(
                [
                  { key: "summary", label: "요약", icon: "📋" },
                  { key: "keypoints", label: "핵심포인트", icon: "🎯" },
                  { key: "practice", label: "문제풀기", icon: "✏️" },
                ] as { key: TabType; label: string; icon: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "summary" && <SummaryTab material={selectedMaterial} />}
            {activeTab === "keypoints" && <KeyPointsTab material={selectedMaterial} />}
            {activeTab === "practice" && <PracticeTab material={selectedMaterial} />}
          </div>
        </main>
      </div>
    </div>
  );
}
