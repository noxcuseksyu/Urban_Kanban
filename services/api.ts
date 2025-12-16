import { Task } from '../types';

// ==========================================
// ⚡ DYNAMIC CLOUD CONFIG ⚡
// ==========================================

const getApiConfig = () => {
  return {
    binId: localStorage.getItem('urban_jsonbin_id') || '',
    apiKey: localStorage.getItem('urban_jsonbin_key') || ''
  };
};

export const apiService = {
  hasUrl() {
    const { binId, apiKey } = getApiConfig();
    return !!binId && !!apiKey;
  },

  async getTasks(): Promise<Task[]> {
    const { binId, apiKey } = getApiConfig();

    // If not configured, fallback gracefully without error
    if (!binId || !apiKey) {
      const saved = localStorage.getItem('kanban-tasks');
      return saved ? JSON.parse(saved) : [];
    }

    const API_URL = `https://api.jsonbin.io/v3/b/${binId}`;

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "X-Master-Key": apiKey
      };

      const response = await fetch(API_URL, { method: "GET", headers });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn("JSONBin Access Denied. Check settings.");
        }
        // Throwing error here to trigger local backup use in catch block
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const record = data.record;

      if (record && record.tasks && Array.isArray(record.tasks)) {
        return record.tasks;
      }
      
      if (Array.isArray(record)) {
        return record;
      }

      return [];
    } catch (error) {
      console.warn("Cloud sync failed (using local backup):", error);
      const saved = localStorage.getItem('kanban-tasks');
      return saved ? JSON.parse(saved) : [];
    }
  },

  async saveTasks(tasks: Task[]): Promise<void> {
    // 1. Always save locally first (Backup)
    localStorage.setItem('kanban-tasks', JSON.stringify(tasks));

    const { binId, apiKey } = getApiConfig();

    // 2. If no config, just stop here (Local Only mode)
    if (!binId || !apiKey) return;

    const API_URL = `https://api.jsonbin.io/v3/b/${binId}`;

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "X-Master-Key": apiKey
      };

      await fetch(API_URL, {
        method: "PUT",
        headers,
        body: JSON.stringify({ tasks }), 
      });
    } catch (error) {
      console.error("Failed to sync to server:", error);
      // We don't throw here to avoid disrupting the UI, just log it.
    }
  }
};