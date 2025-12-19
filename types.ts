export type ColumnId = 'todo' | 'doing' | 'done';

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string; // Base64 or URL
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  columnId: ColumnId;
  color: string; // Hex code
  createdAt: number;
  attachments: Attachment[];
  editors?: number[]; // IDs of users who edited this task
  cardStyle?: 'minimal' | 'filled'; // New styling option
}

export interface UserPresence {
  userId: number;
  lastSeen: number; // Timestamp
  viewingTaskId: string | null; // ID задачи, которую юзер сейчас смотрит/редактирует
}

export interface BoardData {
  tasks: Task[];
  presence: Record<string, UserPresence>; // Key is userId as string
}

export interface LindaResponse {
  text: string;
  suggestions?: string[];
}

export interface User {
  id: number;
  name: string;
  role: string;
  image: string;
  color: string;
  delay: string;
}