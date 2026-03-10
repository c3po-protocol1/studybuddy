const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const TOKEN_KEY = "studybuddy_token";

export function getToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  // Also set cookie for middleware
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = "auth_token=; path=/; max-age=0";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      errorMessage = data.error || errorMessage;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export const apiClient = {
  async get(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async post(path: string, body?: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  async delete(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async upload(path: string, formData: FormData) {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Don't set Content-Type — browser sets it with boundary for multipart
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse(res);
  },
};
