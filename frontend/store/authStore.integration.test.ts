/**
 * Integration tests for the Zustand auth store (useAuthStore).
 *
 * Tests cover the full authentication lifecycle:
 *   - Successful login (Requirements 24.1)
 *   - Failed login with 401 (Requirements 24.1)
 *   - Logout clears state (Requirement 24.4)
 *   - checkAuth validates session and returns true (Requirement 24.2)
 *   - checkAuth returns false and clears state on 401 (Requirement 24.3)
 *   - checkAuth sends Authorization header when token is present (Requirement 24.6)
 *
 * Fetch is mocked globally via vi.stubGlobal so no real network calls are made.
 * Store state is reset before each test by calling logout() to avoid cross-test bleed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "./authStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Response-like object that fetch can return. */
function mockResponse(
  body: unknown,
  status: number = 200
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** Resolve the store to a known clean state before each test. */
function resetStore(): void {
  useAuthStore.setState({
    isAuthenticated: false,
    user: null,
    token: null,
  });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOCK_USER = { id: "1", email: "test@test.com", role: "trader" };
const MOCK_TOKEN = "test-jwt";
const LOGIN_RESPONSE = { token: MOCK_TOKEN, user: MOCK_USER };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("authStore integration", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Login ───────────────────────────────────────────────────────────────

  describe("login()", () => {
    it("sets isAuthenticated, user, and token on a successful login (200)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
        mockResponse(LOGIN_RESPONSE, 200)
      ));

      await useAuthStore.getState().login("test@test.com", "password123");

      const { isAuthenticated, user, token } = useAuthStore.getState();
      expect(isAuthenticated).toBe(true);
      expect(user).toEqual(MOCK_USER);
      expect(token).toBe(MOCK_TOKEN);
    });

    it("calls /api/auth/login with POST and JSON body", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(
        mockResponse(LOGIN_RESPONSE, 200)
      );
      vi.stubGlobal("fetch", mockFetch);

      await useAuthStore.getState().login("test@test.com", "password123");

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/api\/auth\/login$/);
      expect(options.method).toBe("POST");
      expect(options.headers).toMatchObject({ "Content-Type": "application/json" });
      expect(JSON.parse(options.body as string)).toEqual({
        email: "test@test.com",
        password: "password123",
      });
    });

    it("includes credentials: 'include' for HTTP-only cookie handling", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(
        mockResponse(LOGIN_RESPONSE, 200)
      );
      vi.stubGlobal("fetch", mockFetch);

      await useAuthStore.getState().login("test@test.com", "password123");

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(options.credentials).toBe("include");
    });

    it("throws and does NOT update state on 401 Invalid credentials", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
        mockResponse({ detail: "Invalid credentials" }, 401)
      ));

      await expect(
        useAuthStore.getState().login("bad@user.com", "wrongpass")
      ).rejects.toThrow("Invalid credentials");

      const { isAuthenticated, user, token } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
      expect(user).toBeNull();
      expect(token).toBeNull();
    });

    it("throws a generic message when the 401 body has no detail field", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
        mockResponse({}, 401)
      ));

      await expect(
        useAuthStore.getState().login("bad@user.com", "wrongpass")
      ).rejects.toThrow(/Login failed/);
    });

    it("throws when fetch rejects (network error)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(
        new TypeError("Network request failed")
      ));

      await expect(
        useAuthStore.getState().login("test@test.com", "password123")
      ).rejects.toThrow("Network request failed");

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ── Logout ──────────────────────────────────────────────────────────────

  describe("logout()", () => {
    it("clears isAuthenticated, user, and token", () => {
      // Seed the store with authenticated state
      useAuthStore.setState({
        isAuthenticated: true,
        user: MOCK_USER,
        token: MOCK_TOKEN,
      });

      useAuthStore.getState().logout();

      const { isAuthenticated, user, token } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
      expect(user).toBeNull();
      expect(token).toBeNull();
    });

    it("is safe to call when already logged out", () => {
      // Store is already reset; calling logout again should not throw
      expect(() => useAuthStore.getState().logout()).not.toThrow();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ── checkAuth ───────────────────────────────────────────────────────────

  describe("checkAuth()", () => {
    it("returns true and updates user when backend returns 200 with user data", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
        mockResponse(MOCK_USER, 200)
      ));

      const result = await useAuthStore.getState().checkAuth();

      expect(result).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(MOCK_USER);
    });

    it("calls GET /api/auth/me", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(
        mockResponse(MOCK_USER, 200)
      );
      vi.stubGlobal("fetch", mockFetch);

      await useAuthStore.getState().checkAuth();

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/api\/auth\/me$/);
      expect(options.method).toBe("GET");
    });

    it("returns false when backend returns 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
        mockResponse({ detail: "Unauthorized" }, 401)
      ));

      const result = await useAuthStore.getState().checkAuth();

      expect(result).toBe(false);
    });

    it("clears auth state when backend returns 401", async () => {
      // Start in authenticated state
      useAuthStore.setState({
        isAuthenticated: true,
        user: MOCK_USER,
        token: MOCK_TOKEN,
      });

      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
        mockResponse({ detail: "Unauthorized" }, 401)
      ));

      await useAuthStore.getState().checkAuth();

      const { isAuthenticated, user, token } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
      expect(user).toBeNull();
      expect(token).toBeNull();
    });

    it("sends Authorization: Bearer header when a token exists in state", async () => {
      useAuthStore.setState({
        isAuthenticated: true,
        user: MOCK_USER,
        token: MOCK_TOKEN,
      });

      const mockFetch = vi.fn().mockResolvedValueOnce(
        mockResponse(MOCK_USER, 200)
      );
      vi.stubGlobal("fetch", mockFetch);

      await useAuthStore.getState().checkAuth();

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)["Authorization"]).toBe(
        `Bearer ${MOCK_TOKEN}`
      );
    });

    it("does NOT send Authorization header when no token is in state", async () => {
      // Store is reset (token: null) from beforeEach
      const mockFetch = vi.fn().mockResolvedValueOnce(
        mockResponse(MOCK_USER, 200)
      );
      vi.stubGlobal("fetch", mockFetch);

      await useAuthStore.getState().checkAuth();

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(
        (options.headers as Record<string, string>)["Authorization"]
      ).toBeUndefined();
    });

    it("returns false and clears state when fetch rejects (network error)", async () => {
      useAuthStore.setState({
        isAuthenticated: true,
        user: MOCK_USER,
        token: MOCK_TOKEN,
      });

      vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(
        new TypeError("Network request failed")
      ));

      const result = await useAuthStore.getState().checkAuth();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
    });

    it("preserves the in-memory token after a successful checkAuth", async () => {
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        token: MOCK_TOKEN,
      });

      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
        mockResponse(MOCK_USER, 200)
      ));

      await useAuthStore.getState().checkAuth();

      // Token should be preserved (not overwritten by undefined)
      expect(useAuthStore.getState().token).toBe(MOCK_TOKEN);
    });

    it("includes credentials: 'include' for HTTP-only cookie forwarding", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(
        mockResponse(MOCK_USER, 200)
      );
      vi.stubGlobal("fetch", mockFetch);

      await useAuthStore.getState().checkAuth();

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(options.credentials).toBe("include");
    });
  });
});
