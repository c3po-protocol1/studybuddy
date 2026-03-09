import { apiClient, setToken, clearToken, getToken } from "./api-client";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * Decodes the JWT payload without verifying the signature.
 * Returns null if the token is invalid or expired.
 */
function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Base64url decode
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Login with email and password. Saves the JWT token and returns the user.
 */
export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  const data = await apiClient.post("/api/auth/login", { email, password });
  if (!data.token) {
    throw new Error("No token returned from server");
  }
  setToken(data.token);
  return data.user as AuthUser;
}

/**
 * Register a new user. Returns the created user.
 */
export async function register(
  email: string,
  password: string,
  name?: string
): Promise<AuthUser> {
  const body: Record<string, string> = { email, password };
  if (name) body.name = name;
  const data = await apiClient.post("/api/auth/register", body);
  if (data.token) {
    setToken(data.token);
  }
  return (data.user || data) as AuthUser;
}

/**
 * Logout: clear token and redirect to sign-in page.
 */
export function logout(): void {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/auth/signin";
  }
}

/**
 * Get the currently authenticated user by decoding the JWT.
 * Returns null if no valid token exists.
 */
export function getUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;

  const payload = decodeJWT(token);
  if (!payload) return null;

  // Check expiry
  const exp = payload.exp as number | undefined;
  if (exp && Date.now() / 1000 > exp) {
    clearToken();
    return null;
  }

  return {
    id: payload.sub as string,
    email: payload.email as string,
    name: (payload.name as string) || null,
  };
}

/**
 * Check if the user is currently authenticated with a valid token.
 */
export function isAuthenticated(): boolean {
  return getUser() !== null;
}
