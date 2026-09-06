/**
 * Full authentication flow integration tests for useAuthStore.
 *
 * This file tests end-to-end authentication scenarios that span multiple
 * store actions and state transitions, complementing the unit-level tests
 * in authStore.integration.test.ts. The focus here is on:
 *
 *   - Login → authenticated state propagation               (Req 24.1)
 *   - Failed login → state unchanged, error propagated      (Req 24.1)
 *   - Route guard scenario: checkAuth() failure → false     (Req 24.2, 24.3)
 *   - Logout → full state clear                             (Req 24.4)
 *   - checkAuth() with valid backend → isAuthenticated=true (Req 24.2)
 *   - checkAuth() with 401 → state cleared                  (Req 24.3)
 *   - 401 from backend API triggers logout via authStore     (Req 24.7)
 *   - Token present in-memory after login, cleared on logout (Req 24.5, 24.6)
 *
 * Test isolation: each test resets store state via setState in beforeEach.
 * Fetch is mocked via vi.stubGlobal — no real network requests.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { useAuthStore } from "./authStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "usr-1", email: "trader@sovereign.io", role: "trader" };
const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature";
const LOGIN_RESPONSE = { token: MOCK_TOKEN, user: MOCK_USER };

/** Build a minimal Response-like object that satisfies fetch expectations. */
function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** Hard-reset auth store to unauthenticated state. */
function resetStore(): void {
  useAuthStore.setState({
    isAuthenticated: false,
    user: null,
    token: null,
  });
}

/** Seed the store as if the user is already logged in. */
function seedAuthenticated(): void {
  useAuthStore.setState({
    isAuthenticated: true,
    user: MOCK_USER,
    token: MOCK_TOKEN,
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Successful login flow (Requirement 24.1)
// ---------------------------------------------------------------------------

describe("Full login flow — success", () => {
  it("isAuthenticated becomes true after successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse(LOGIN_RESPONSE, 200))
    );

    await useAuthStore.getState().login("trader@sovereign.io", "password123");

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("user is populated with backend response after successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse(LOGIN_RESPONSE, 200))
    );

    await useAuthStore.getState().login("trader@sovereign.io", "password123");

    expect(useAuthStore.getState().user).toEqual(MOCK_USER);
  });

  it("token is stored in-memory after successful login (Requirement 24.5, 24.6)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse(LOGIN_RESPONSE, 200))
    );

    await useAuthStore.getState().login("trader@sovereign.io", "password123");

    expect(useAuthStore.getState().token).toBe(MOCK_TOKEN);
  });

  it("login then checkAuth sequence produces isAuthenticated=true", async () => {
    // Step 1: login
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(mockResponse(LOGIN_RESPONSE, 200))   // login
        .mockResolvedValueOnce(mockResponse(MOCK_USER, 200))        // checkAuth
    );

    await useAuthStore.getState().login("trader@sovereign.io", "password123");
    const valid = await useAuthStore.getState().checkAuth();

    expect(valid).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Failed login flow (Requirement 24.1)
// ---------------------------------------------------------------------------

describe("Full login flow — failure", () => {
  it("throws an error when credentials are invalid (401)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockResponse({ detail: "Invalid credentials" }, 401)
      )
    );

    await expect(
      useAuthStore.getState().login("bad@user.com", "wrong")
    ).rejects.toThrow("Invalid credentials");
  });

  it("isAuthenticated remains false after a failed login attempt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse({ detail: "Forbidden" }, 403))
    );

    try {
      await useAuthStore.getState().login("bad@user.com", "wrong");
    } catch {
      // expected
    }

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("user remains null after a failed login attempt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse({ detail: "Unauthorized" }, 401))
    );

    try {
      await useAuthStore.getState().login("bad@user.com", "wrong");
    } catch {
      // expected
    }

    expect(useAuthStore.getState().user).toBeNull();
  });

  it("token remains null after a failed login attempt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse({}, 401))
    );

    try {
      await useAuthStore.getState().login("bad@user.com", "wrong");
    } catch {
      // expected
    }

    expect(useAuthStore.getState().token).toBeNull();
  });

  it("network failure during login throws and leaves state unchanged", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("Network request failed"))
    );

    await expect(
      useAuthStore.getState().login("trader@sovereign.io", "password123")
    ).rejects.toThrow("Network request failed");

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Route guard scenario: checkAuth() failure (Requirements 24.2, 24.3)
// ---------------------------------------------------------------------------

describe("Route guard scenario — checkAuth() failure triggers redirect logic", () => {
  /**
   * The dashboard layout calls checkAuth() on every route access.
   * When it returns false the route guard redirects to /login.
   * We validate that the store state correctly signals the redirect.
   */

  it("checkAuth() returns false when backend responds with 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse({ detail: "Unauthorized" }, 401))
    );

    const result = await useAuthStore.getState().checkAuth();

    expect(result).toBe(false);
  });

  it("checkAuth() clears isAuthenticated on 401 so route guard redirects", async () => {
    seedAuthenticated();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse({ detail: "Expired" }, 401))
    );

    await useAuthStore.getState().checkAuth();

    // Route guard reads isAuthenticated — must be false to trigger redirect
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("checkAuth() clears token on 401 so subsequent requests stop carrying it", async () => {
    seedAuthenticated();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse({ detail: "Expired" }, 401))
    );

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().token).toBeNull();
  });

  it("checkAuth() clears user on 401", async () => {
    seedAuthenticated();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse({ detail: "Expired" }, 401))
    );

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().user).toBeNull();
  });

  it("checkAuth() returns false on network failure (simulates expired token)", async () => {
    seedAuthenticated();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("Network request failed"))
    );

    const result = await useAuthStore.getState().checkAuth();

    expect(result).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("route guard invokes checkAuth() and observes false for an unauthenticated user", async () => {
    // Simulate what the dashboard layout.tsx does: call checkAuth and branch on result
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse({ detail: "Not logged in" }, 401))
    );

    const shouldRenderDashboard = await useAuthStore.getState().checkAuth();

    // Route guard logic: if false → redirect to /login
    expect(shouldRenderDashboard).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Logout flow (Requirement 24.4)
// ---------------------------------------------------------------------------

describe("Logout flow", () => {
  it("isAuthenticated becomes false after logout", () => {
    seedAuthenticated();

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("user is cleared to null after logout", () => {
    seedAuthenticated();

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
  });

  it("token is cleared to null after logout", () => {
    seedAuthenticated();

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
  });

  it("calling logout twice is idempotent", () => {
    seedAuthenticated();

    useAuthStore.getState().logout();
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("login then logout results in unauthenticated state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse(LOGIN_RESPONSE, 200))
    );

    await useAuthStore.getState().login("trader@sovereign.io", "password123");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkAuth() with valid backend (Requirement 24.2)
// ---------------------------------------------------------------------------

describe("checkAuth() — valid backend response", () => {
  it("returns true when backend responds with 200 and user data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse(MOCK_USER, 200))
    );

    const result = await useAuthStore.getState().checkAuth();

    expect(result).toBe(true);
  });

  it("isAuthenticated becomes true after successful checkAuth()", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse(MOCK_USER, 200))
    );

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("user is populated with backend data after successful checkAuth()", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse(MOCK_USER, 200))
    );

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().user).toEqual(MOCK_USER);
  });

  it("in-memory token is preserved (not overwritten) after checkAuth()", async () => {
    useAuthStore.setState({ token: MOCK_TOKEN });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse(MOCK_USER, 200))
    );

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().token).toBe(MOCK_TOKEN);
  });

  it("checkAuth() sends Authorization: Bearer header when token is in-memory", async () => {
    seedAuthenticated();

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(MOCK_USER, 200));
    vi.stubGlobal("fetch", mockFetch);

    await useAuthStore.getState().checkAuth();

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(
      `Bearer ${MOCK_TOKEN}`
    );
  });
});

// ---------------------------------------------------------------------------
// 401 from backend API triggers logout via authStore (Requirement 24.7)
// ---------------------------------------------------------------------------

describe("401 from backend API — automatic logout via authStore", () => {
  /**
   * Requirement 24.7: IF the backend returns 401 Unauthorized, the frontend
   * SHALL redirect to the login page. The store models this by clearing auth
   * state so the next checkAuth() call returns false.
   *
   * In the actual app an API client layer would call store.logout() on 401.
   * Here we simulate that directly to validate the store behaviour.
   */

  it("calling logout() after a 401 API response clears isAuthenticated", () => {
    seedAuthenticated();

    // Simulate: API returns 401 → middleware calls store.logout()
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("after logout triggered by 401, checkAuth() returns false", async () => {
    seedAuthenticated();

    // Simulate 401 logout
    useAuthStore.getState().logout();

    // Route guard calls checkAuth()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse({ detail: "Unauthorized" }, 401))
    );

    const result = await useAuthStore.getState().checkAuth();

    expect(result).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("after logout triggered by 401, subsequent login re-authenticates", async () => {
    seedAuthenticated();

    // Simulate 401 logout
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    // User re-logs in
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse(LOGIN_RESPONSE, 200))
    );

    await useAuthStore.getState().login("trader@sovereign.io", "password123");

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe(MOCK_TOKEN);
  });

  it("checkAuth() with 401 simulates expired token clearing state (Requirement 24.3)", async () => {
    // Seed in-memory token as if previously logged in
    useAuthStore.setState({
      isAuthenticated: true,
      user: MOCK_USER,
      token: "expired.jwt.token",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockResponse({ detail: "Token expired" }, 401))
    );

    const result = await useAuthStore.getState().checkAuth();

    expect(result).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("full 401 cycle: login → 401 logout → re-login works correctly", async () => {
    const mockFetch = vi
      .fn()
      // First call: successful login
      .mockResolvedValueOnce(mockResponse(LOGIN_RESPONSE, 200))
      // Second call: checkAuth succeeds (session active)
      .mockResolvedValueOnce(mockResponse(MOCK_USER, 200))
      // Third call: an API call returns 401 (token expired mid-session)
      // — In the actual app an interceptor calls logout(); we simulate directly
      // Fourth call: re-login after forced logout
      .mockResolvedValueOnce(mockResponse(LOGIN_RESPONSE, 200));

    vi.stubGlobal("fetch", mockFetch);

    // Step 1: login
    await useAuthStore.getState().login("trader@sovereign.io", "password123");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Step 2: checkAuth (dashboard mount)
    const valid = await useAuthStore.getState().checkAuth();
    expect(valid).toBe(true);

    // Step 3: simulate 401 interceptor → force logout
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    // Step 4: user re-authenticates
    await useAuthStore.getState().login("trader@sovereign.io", "password123");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe(MOCK_TOKEN);
  });
});
