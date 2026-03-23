import { type Page, type APIRequestContext } from "@playwright/test";

const API_BASE = "http://localhost:8080";

/**
 * Generate a unique test user for each test run to keep tests isolated.
 */
export function generateTestUser(prefix = "e2e") {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `${id}@test.local`,
    password: "TestPass123!",
    name: `Test User ${id}`,
  };
}

/**
 * Register a new user via the backend API.
 */
export async function registerUser(
  request: APIRequestContext,
  user: { email: string; password: string; name?: string }
) {
  const res = await request.post(`${API_BASE}/api/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      name: user.name,
    },
  });
  if (!res.ok()) {
    throw new Error(`Registration failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Login a user via the backend API and return the JWT token.
 */
export async function loginUser(
  request: APIRequestContext,
  user: { email: string; password: string }
): Promise<string> {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: {
      email: user.email,
      password: user.password,
    },
  });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

/**
 * Register + login via API, then inject the JWT token into the browser's
 * localStorage and cookies so the app recognizes the user as authenticated.
 */
export async function authenticateUser(
  page: Page,
  request: APIRequestContext,
  userOverrides?: Partial<{ email: string; password: string; name: string }>
) {
  const user = { ...generateTestUser(), ...userOverrides };

  await registerUser(request, user);
  const token = await loginUser(request, user);

  // Navigate to the app first so we can set localStorage on the correct origin
  await page.goto("/auth/signin");

  // Inject token into localStorage and cookie
  await page.evaluate(
    ({ token, key }) => {
      localStorage.setItem(key, token);
      const maxAge = 7 * 24 * 60 * 60;
      document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    },
    { token, key: "studybuddy_token" }
  );

  return { user, token };
}

/**
 * Create a study space via API. Returns the created space object.
 */
export async function createSpaceViaAPI(
  request: APIRequestContext,
  token: string,
  space: { name: string; emoji?: string; color?: string }
) {
  const res = await request.post(`${API_BASE}/api/spaces`, {
    data: {
      name: space.name,
      emoji: space.emoji || "📚",
      color: space.color || "#6366f1",
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`Create space failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Create a study group via API. Returns the created group object.
 */
export async function createGroupViaAPI(
  request: APIRequestContext,
  token: string,
  group: { name: string; emoji?: string; description?: string }
) {
  const res = await request.post(`${API_BASE}/api/groups`, {
    data: {
      name: group.name,
      emoji: group.emoji || "📖",
      description: group.description || "",
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`Create group failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}
