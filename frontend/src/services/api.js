/**
 * Centralized API client for User Analytics Backend
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api').replace(/\/+$/, '');

async function handleResponse(response) {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error || `HTTP error ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }
  return response.json();
}

export const api = {
  /**
   * Health check for Flask server and MongoDB connection
   */
  async getHealth() {
    return handleResponse(await fetch(`${API_BASE_URL}/health`));
  },

  /**
   * High-level analytics metrics for overview cards
   */
  async getOverviewStats() {
    return handleResponse(await fetch(`${API_BASE_URL}/stats/overview`));
  },

  /**
   * List of all recorded user sessions
   */
  async getSessions(limit = 50, skip = 0) {
    return handleResponse(await fetch(`${API_BASE_URL}/sessions?limit=${limit}&skip=${skip}`));
  },

  /**
   * Chronological event timeline for a specific session
   */
  async getSessionEvents(sessionId) {
    if (!sessionId) return { success: true, events: [] };
    return handleResponse(await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/events`));
  },

  /**
   * Page-specific recorded click coordinates for heatmap rendering
   */
  async getClickEvents(pageUrl = '') {
    const url = pageUrl
      ? `${API_BASE_URL}/events/clicks?page_url=${encodeURIComponent(pageUrl)}`
      : `${API_BASE_URL}/events/clicks`;
    return handleResponse(await fetch(url));
  }
};
