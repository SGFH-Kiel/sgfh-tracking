export interface TimeEntry {
  id?: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  description: string;
  project?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
