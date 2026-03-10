/**
 * Tests for the RAG document upload page component.
 * fetch is mocked — no real network calls.
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RagUploadPage from "@/app/rag/page";

// Polyfill for jsdom: DataTransfer isn't fully implemented
// We'll use fireEvent.change instead of drag-and-drop for most tests.

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

// Helper: create a File object
function makeFile(name: string, type: string, size = 100): File {
  const content = new Array(size).fill("a").join("");
  return new File([content], name, { type });
}

// ── Render ──────────────────────────────────────────────────────────────────

describe("RagUploadPage — render", () => {
  it("renders heading", () => {
    render(<RagUploadPage />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });

  it("renders a file input", () => {
    render(<RagUploadPage />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    expect(input).not.toBeNull();
  });

  it("renders an upload button", () => {
    render(<RagUploadPage />);
    expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
  });

  it("upload button is disabled when no file selected", () => {
    render(<RagUploadPage />);
    const btn = screen.getByRole("button", { name: /upload/i });
    expect(btn).toBeDisabled();
  });
});

// ── File selection ───────────────────────────────────────────────────────────

describe("RagUploadPage — file selection", () => {
  it("enables upload button after a file is chosen", async () => {
    render(<RagUploadPage />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = makeFile("notes.txt", "text/plain");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(screen.getByRole("button", { name: /upload/i })).toBeEnabled();
  });

  it("shows selected filename", async () => {
    render(<RagUploadPage />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = makeFile("lecture.pdf", "application/pdf");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(screen.getByText(/lecture\.pdf/i)).toBeInTheDocument();
  });
});

// ── Upload success ───────────────────────────────────────────────────────────

describe("RagUploadPage — upload success", () => {
  it("shows success message on 200 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok", filename: "notes.txt", chunks: 5 }),
    });

    render(<RagUploadPage />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("notes.txt", "text/plain")] } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /upload/i }));
    });

    await waitFor(() => expect(screen.getByText(/success/i)).toBeInTheDocument());
  });

  it("calls /api/rag/ingest with multipart file", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok", filename: "doc.pdf", chunks: 3 }),
    });

    render(<RagUploadPage />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = makeFile("doc.pdf", "application/pdf");
    fireEvent.change(input, { target: { files: [file] } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /upload/i }));
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/rag\/ingest/);
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it("shows chunk count on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok", filename: "x.txt", chunks: 7 }),
    });

    render(<RagUploadPage />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("x.txt", "text/plain")] } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /upload/i }));
    });

    await waitFor(() => expect(screen.getByText(/7/)).toBeInTheDocument());
  });
});

// ── Upload error ─────────────────────────────────────────────────────────────

describe("RagUploadPage — upload error", () => {
  it("shows error on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "unsupported file type: .docx" }),
    });

    render(<RagUploadPage />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("bad.docx", "application/octet-stream")] } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /upload/i }));
    });

    await waitFor(() => expect(screen.getByText("Error")).toBeInTheDocument());
    expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
  });

  it("shows error on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<RagUploadPage />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("doc.txt", "text/plain")] } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /upload/i }));
    });

    await waitFor(() => expect(screen.getByText("Error")).toBeInTheDocument());
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});

// ── Loading state ────────────────────────────────────────────────────────────

describe("RagUploadPage — loading state", () => {
  it("disables button while uploading", async () => {
    let resolveFetch!: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolveFetch = r; }));

    render(<RagUploadPage />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("doc.txt", "text/plain")] } });

    const btn = screen.getByRole("button", { name: /upload/i });
    fireEvent.click(btn);

    await waitFor(() => expect(btn).toBeDisabled());

    // Resolve to avoid dangling promise
    resolveFetch({ ok: true, json: async () => ({ status: "ok", filename: "doc.txt", chunks: 1 }) });
  });
});
