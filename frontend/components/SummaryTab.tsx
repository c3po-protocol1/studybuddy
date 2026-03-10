"use client";

import React from "react";

interface Material {
  id: string;
  filename: string;
  status: string;
  summary?: { content: string } | null;
}

interface Props {
  material: Material | null;
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactElement[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("### ")) {
      elements.push(<h3 key={key++}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++}>{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={key++}>{line.slice(2)}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<li key={key++}>{line.slice(2)}</li>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<p key={key++}><strong>{line.slice(2, -2)}</strong></p>);
    } else if (line.trim() === "") {
      elements.push(<br key={key++} />);
    } else {
      elements.push(<p key={key++}>{line}</p>);
    }
  }
  return elements;
}

export default function SummaryTab({ material }: Props) {
  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-sm">왼쪽에서 자료를 선택해주세요.</p>
      </div>
    );
  }

  if (material.status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
        <p className="font-medium">AI가 분석 중입니다...</p>
        <p className="text-sm text-gray-400 mt-1">요약을 생성하고 있습니다.</p>
      </div>
    );
  }

  if (!material.summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-5xl mb-3">📝</div>
        <p className="text-sm">요약이 아직 없습니다. 자료를 처리해주세요.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">📋</span>
        <h3 className="text-lg font-semibold text-gray-900">AI 요약</h3>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{material.filename}</span>
      </div>
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 prose text-gray-700 text-sm leading-relaxed">
        {renderMarkdown(material.summary.content)}
      </div>
    </div>
  );
}
