"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

interface Question {
  id: string;
  type: string;
  question: string;
  options: string | null;
  answer: string;
  explanation: string;
  topic: string;
  answerHistory?: { isCorrect: boolean }[];
}

interface Material {
  id: string;
  filename: string;
  status: string;
  _count?: { questions: number };
}

interface Props {
  material: Material | null;
}

interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

export default function PracticeTab({ material }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingAdaptive, setFetchingAdaptive] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  const fetchQuestions = useCallback(async () => {
    if (!material) return;
    try {
      const data = await apiClient.get(`/api/adaptive?materialId=${material.id}`);
      setQuestions(Array.isArray(data) ? data : []);
      setCurrentIndex(0);
      setResult(null);
      setUserAnswer("");
    } catch {
      setQuestions([]);
    }
  }, [material]);

  useEffect(() => {
    if (material?.status === "done") fetchQuestions();
  }, [material, fetchQuestions]);

  const handleSubmit = async () => {
    if (!userAnswer.trim() || !questions[currentIndex]) return;
    setLoading(true);
    try {
      const data = await apiClient.post(
        `/api/questions/${questions[currentIndex].id}/answer`,
        { userAnswer }
      );
      setResult(data);
      if (data.isCorrect) setStats((s) => ({ ...s, correct: s.correct + 1 }));
      else setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setUserAnswer("");
      setResult(null);
    }
  };

  const handleGenerateAdaptive = async () => {
    if (!material) return;
    setFetchingAdaptive(true);
    try {
      const data = await apiClient.post("/api/adaptive", { materialId: material.id });
      alert(data.message);
      fetchQuestions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setFetchingAdaptive(false);
    }
  };

  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-5xl mb-3">✏️</div>
        <p className="text-sm">왼쪽에서 자료를 선택해주세요.</p>
      </div>
    );
  }

  if (material.status !== "done") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-5xl mb-3">⏳</div>
        <p className="text-sm">자료 처리가 완료되면 문제풀기가 활성화됩니다.</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-5xl mb-3">✏️</div>
        <p className="text-sm">문제가 없습니다. 자료를 다시 처리해주세요.</p>
      </div>
    );
  }

  const question = questions[currentIndex];
  const options: string[] = question.options ? JSON.parse(question.options) : [];
  const isMultipleChoice = question.type === "multiple_choice";
  const total = questions.length;
  const progress = ((currentIndex + 1) / total) * 100;

  return (
    <div className="p-6">
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex gap-4">
          <span className="text-green-600 font-medium">✓ {stats.correct}개 정답</span>
          <span className="text-red-500 font-medium">✗ {stats.wrong}개 오답</span>
        </div>
        <span className="text-gray-400">{currentIndex + 1} / {total}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              isMultipleChoice
                ? "bg-blue-100 text-blue-700"
                : "bg-orange-100 text-orange-700"
            }`}>
              {isMultipleChoice ? "객관식" : "단답형"}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{question.topic}</span>
          </div>
          <p className="text-gray-900 font-medium leading-relaxed">{question.question}</p>
        </div>

        <div className="p-5">
          {isMultipleChoice ? (
            <div className="space-y-2">
              {options.map((opt, i) => {
                let btnClass =
                  "w-full text-left p-3 rounded-xl border text-sm transition-all ";
                if (result) {
                  const isThisCorrect =
                    opt === result.correctAnswer ||
                    String(i + 1) === result.correctAnswer ||
                    opt.startsWith(result.correctAnswer);
                  const isThisSelected = opt === userAnswer || String(i + 1) === userAnswer;
                  if (isThisCorrect)
                    btnClass += "border-green-400 bg-green-50 text-green-800 font-medium";
                  else if (isThisSelected && !result.isCorrect)
                    btnClass += "border-red-400 bg-red-50 text-red-700";
                  else
                    btnClass += "border-gray-200 text-gray-500";
                } else {
                  btnClass +=
                    userAnswer === opt || userAnswer === String(i + 1)
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-gray-700";
                }
                return (
                  <button
                    key={i}
                    className={btnClass}
                    onClick={() => !result && setUserAnswer(String(i + 1))}
                    disabled={!!result}
                  >
                    <span className="font-medium mr-2">{i + 1}.</span> {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !result && handleSubmit()}
              placeholder="답을 입력하세요..."
              disabled={!!result}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
            />
          )}

          {/* Result feedback */}
          {result && (
            <div className={`mt-4 p-4 rounded-xl text-sm ${
              result.isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}>
              <p className={`font-semibold mb-1 ${result.isCorrect ? "text-green-700" : "text-red-700"}`}>
                {result.isCorrect ? "✓ 정답입니다!" : `✗ 오답! 정답: ${result.correctAnswer}`}
              </p>
              <p className="text-gray-600">{result.explanation}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          {!result ? (
            <button
              onClick={handleSubmit}
              disabled={!userAnswer.trim() || loading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {loading ? "채점 중..." : "제출"}
            </button>
          ) : (
            <>
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  다음 문제 →
                </button>
              ) : (
                <div className="flex-1 text-center text-sm text-gray-500 py-2.5">
                  🎉 모든 문제 완료! 정답 {stats.correct}/{total}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Adaptive learning button */}
      <div className="mt-5">
        <button
          onClick={handleGenerateAdaptive}
          disabled={fetchingAdaptive || stats.wrong === 0}
          className="w-full py-3 border-2 border-dashed border-purple-200 text-purple-600 rounded-xl text-sm font-medium hover:border-purple-400 hover:bg-purple-50 disabled:opacity-40 transition-colors"
        >
          {fetchingAdaptive ? "보충 문제 생성 중..." : "🧠 내 약점 기반 보충 문제 생성"}
        </button>
        {stats.wrong === 0 && (
          <p className="text-center text-xs text-gray-400 mt-2">틀린 문제가 있을 때 활성화됩니다.</p>
        )}
      </div>
    </div>
  );
}
