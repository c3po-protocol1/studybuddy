"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  spaceId: string;
  onUploadComplete: (materialId: string) => void;
}

export default function FileUploader({ spaceId, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setUploading(true);
      setUploadStatus(`"${file.name}" 업로드 중...`);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch(`/api/spaces/${spaceId}/materials`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          setUploadStatus(`오류: ${err.error}`);
          return;
        }

        const material = await uploadRes.json();
        setUploadStatus("AI 분석 중... (요약, 핵심포인트, 문제 생성)");

        const processRes = await fetch(`/api/materials/${material.id}/process`, {
          method: "POST",
        });

        if (!processRes.ok) {
          setUploadStatus("AI 처리 중 오류가 발생했습니다.");
          return;
        }

        setUploadStatus("완료!");
        setTimeout(() => {
          setUploadStatus("");
          onUploadComplete(material.id);
        }, 1000);
      } catch {
        setUploadStatus("오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setUploading(false);
      }
    },
    [spaceId, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50"
            : uploading
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50"
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <p className="text-sm text-gray-600">{uploadStatus}</p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl">📂</div>
            <p className="text-sm font-medium text-indigo-600">파일을 놓아주세요!</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl">📄</div>
            <p className="text-sm font-medium text-gray-700">파일을 드래그하거나 클릭하여 업로드</p>
            <p className="text-xs text-gray-400">PDF, TXT 지원 (최대 1개)</p>
          </div>
        )}
      </div>
      {uploadStatus && !uploading && (
        <p className={`text-sm text-center ${uploadStatus.includes("오류") ? "text-red-500" : "text-green-600"}`}>
          {uploadStatus}
        </p>
      )}
    </div>
  );
}
