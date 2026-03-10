"use client";

import { useRef, useState } from "react";

type UploadStatus =
  | { state: "idle" }
  | { state: "uploading" }
  | { state: "success"; filename: string; chunks: number }
  | { state: "error"; message: string };

export default function RagUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>({ state: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setStatus({ state: "idle" });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped) {
      setFile(dropped);
      setStatus({ state: "idle" });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus({ state: "uploading" });

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/rag/ingest", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ state: "error", message: data.detail ?? data.error ?? "Upload failed" });
        return;
      }
      setStatus({ state: "success", filename: data.filename, chunks: data.chunks });
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Network error" });
    }
  };

  const uploading = status.state === "uploading";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-lg p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Upload Study Document</h1>
        <p className="text-sm text-gray-500">
          Supported formats: PDF, TXT, MD. Max size: 50 MB.
        </p>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          {file ? (
            <p className="text-gray-700 font-medium">{file.name}</p>
          ) : (
            <p className="text-gray-400">Drag & drop a file here, or click to browse</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full py-3 px-6 rounded-xl bg-blue-600 text-white font-semibold
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>

        {/* Status messages */}
        {status.state === "success" && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
            <p className="font-semibold">Success — document ingested!</p>
            <p className="text-sm mt-1">
              {status.filename} · {status.chunks} chunk{status.chunks !== 1 ? "s" : ""} indexed
            </p>
          </div>
        )}

        {status.state === "error" && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{status.message}</p>
          </div>
        )}
      </div>
    </main>
  );
}
