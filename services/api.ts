import { Task, BoardData, UserPresence } from '../types';

// ==========================================
// ⚡ DYNAMIC CLOUD CONFIG ⚡
// DIRECTIVE #1: HARDCODED CREDENTIALS
// FORCED SINGLE SOURCE OF TRUTH
// ==========================================

const GLOBAL_BIN_ID = '69400aa9d0ea881f402ae7a5';
const GLOBAL_API_KEY = '$2a$10$RMqkvlImyCSakfPm0WcLdeIMXUzPFmi2RRuoQ9G3tTdzn8.z2K/ES';

export const apiService = {
  getEffectiveConfig() {
    return {
      binId: GLOBAL_BIN_ID,
      apiKey: GLOBAL_API_KEY
    };
  },

  hasUrl() {
    return true;
  },

  // Get Full Board Data (Tasks + Presence)
  async getBoardData(): Promise<BoardData> {
    const API_URL = `https://api.jsonbin.io/v3/b/${GLOBAL_BIN_ID}`;

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "X-Master-Key": GLOBAL_API_KEY
      };

      const response = await fetch(API_URL, { method: "GET", headers });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const record = data.record;

      // Handle legacy format (array only) vs new format (object)
      if (Array.isArray(record)) {
        return { tasks: record, presence: {} };
      }
      
      if (record && record.tasks) {
        return {
          tasks: Array.isArray(record.tasks) ? record.tasks : [],
          presence: record.presence || {}
        };
      }

      return { tasks: [], presence: {} };
    } catch (error) {
      console.warn("Cloud sync failed (using local backup)", error);
      throw error;
    }
  },

  // Wrapper for backward compatibility if needed, but App.tsx will use getBoardData logic
  async getTasks(): Promise<Task[]> {
    const data = await this.getBoardData();
    return data.tasks;
  },

  // Save everything, including merging presence
  async saveBoardState(tasks: Task[], localPresence: UserPresence): Promise<void> {
    // 1. Backup local
    localStorage.setItem('kanban-tasks', JSON.stringify(tasks));

    const API_URL = `https://api.jsonbin.io/v3/b/${GLOBAL_BIN_ID}`;

    try {
      // 2. Fetch latest to merge presence (Optimistic Locking simulation)
      // We don't want to overwrite other people's presence
      const currentServerData = await this.getBoardData();
      
      const newPresence = { 
        ...currentServerData.presence,
        [localPresence.userId]: localPresence 
      };

      // Cleanup old presence (users offline > 2 mins) to save bandwidth
      const now = Date.now();
      Object.keys(newPresence).forEach(key => {
        if (now - newPresence[key].lastSeen > 120000) {
          delete newPresence[key];
        }
      });

      const payload: BoardData = {
        tasks: tasks,
        presence: newPresence
      };

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "X-Master-Key": GLOBAL_API_KEY
      };

      await fetch(API_URL, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload), 
      });
    } catch (error) {
      console.error("Failed to sync board state:", error);
    }
  },
  
  // Legacy alias
  async saveTasks(tasks: Task[]): Promise<void> {
    // If called without presence, just mock it (should not happen in new App.tsx)
    await this.saveBoardState(tasks, { userId: 0, lastSeen: Date.now(), viewingTaskId: null });
  }
};