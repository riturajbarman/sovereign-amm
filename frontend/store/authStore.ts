import { create } from 'zustand';
import { AuthState, User, LoginResponse } from '@/types/auth';

/**
 * Zustand authentication store implementing AuthState.
 *
 * Manages the full authentication lifecycle:
 * - `login`     — POST /api/auth/login, stores token and user on success
 * - `logout`    — clears in-memory token/user, sets isAuthenticated=false
 * - `checkAuth` — GET /api/auth/me, validates current token; clears state on failure
 *
 * The authoritative token copy lives in the HTTP-only Set-Cookie header returned
 * by the backend (Requirement 24.1). The `token` field here mirrors it for
 * in-memory use (WebSocket handshake, Bearer header).
 *
 * Related requirements: 24.1, 24.2, 24.4
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  isAuthenticated: false,
  user: null,
  token: null,

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Submit credentials to the backend auth endpoint.
   * On success the backend sets an HTTP-only cookie (Requirement 24.1) and also
   * returns the JWT in the response body for in-memory use.
   *
   * @throws {Error} When the server responds with a non-OK status or the
   *                 network request fails entirely.
   */
  login: async (email: string, password: string): Promise<void> => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send / receive HTTP-only cookies
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let message = `Login failed (HTTP ${response.status})`;
      try {
        const body = await response.json();
        if (body?.detail) message = body.detail;
        else if (body?.message) message = body.message;
      } catch {
        // Non-JSON error body — keep default message
      }
      throw new Error(message);
    }

    const data: LoginResponse = await response.json();

    set({
      isAuthenticated: true,
      user: data.user,
      token: data.token,
    });
  },

  /**
   * Clear all authentication state.
   * The backend's HTTP-only cookie is expected to be cleared via a separate
   * logout API call by the UI layer if needed; this action handles the client
   * in-memory state only (Requirement 24.4).
   */
  logout: (): void => {
    set({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  },

  /**
   * Validate the current session by calling GET /api/auth/me.
   * Sends the HTTP-only cookie automatically (credentials: 'include') and also
   * attaches the in-memory Bearer token when available (Requirement 24.2, 24.6).
   *
   * @returns true if the session is active and valid, false otherwise.
   *
   * On validation failure (401, network error, etc.) all auth state is cleared
   * so route guards can redirect to /login (Requirement 24.3).
   */
  checkAuth: async (): Promise<boolean> => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
    const { token } = get();

    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBase}/api/auth/me`, {
        method: 'GET',
        headers,
        credentials: 'include', // Forward HTTP-only cookie
      });

      if (!response.ok) {
        // Treat any non-OK status as unauthenticated
        set({ isAuthenticated: false, user: null, token: null });
        return false;
      }

      const user: User = await response.json();

      set({
        isAuthenticated: true,
        user,
        // Preserve existing in-memory token; the cookie remains the
        // authoritative source. A fresh token may optionally come back
        // in the response headers, but that is handled at the API layer.
        token: get().token,
      });

      return true;
    } catch {
      // Network error or unexpected exception — treat as unauthenticated
      set({ isAuthenticated: false, user: null, token: null });
      return false;
    }
  },
}));
