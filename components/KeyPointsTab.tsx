"use client";

interface Material {
  id: string;
  filename: string;
  status: string;
  keyPoints?: { points: string } | null;
}

interface Props {
  material: Material | null;
}

export default function KeyPointsTab({ material }: Props) {
  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-5xl mb-3">🎯</div>
        <p className="text-sm">왼쪽에서 자료를 선택해주세요.</p>
      </div>
    );
  }

  if (material.status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4" />
        <p className="font-medium">AI가 핵심포인트를 추출 중...</p>
      </div>
    );
  }

  if (!material.keyPoints) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-5xl mb-3">🎯</div>
        <p className="text-sm">핵심포인트가 아직 없습니다.</p>
      </div>
    );
  }

  let points: string[] = [];
  try {
    points = JSON.parse(material.keyPoints.points);
  } catch {
    points = [];
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">🎯</span>
        <h3 className="text-lg font-semibold text-gray-900">핵심 암기 포인트</h3>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
          총 {points.length}개
        </span>
      </div>
      <div className="space-y-3">
        {points.map((point, i) => (
          <div
            key={i}
            className="flex gap-3 items-start bg-white rounded-xl p-4 border border-purple-100 hover:border-purple-300 transition-colors shadow-sm"
          >
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{point}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
