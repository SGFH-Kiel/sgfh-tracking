import { DatabaseProvider } from '../services/interfaces/database';
import { ActivityLogEntry, ActivityType, ActivityEntityType } from '../types/models';

const COLLECTION = 'activityLog';

export interface WriteActivityLogInput {
  type: ActivityType;
  entityId: string;
  entityType: ActivityEntityType;
  actorId: string;
  actorName: string;
  details: Record<string, unknown>;
}

export async function writeActivityLog(
  database: DatabaseProvider,
  input: WriteActivityLogInput,
): Promise<void> {
  const entry: Omit<ActivityLogEntry, 'id'> = {
    ...input,
    timestamp: new Date(),
  };
  try {
    await database.addDocument(COLLECTION, entry);
  } catch (error) {
    console.error('Error writing activity log entry:', error);
  }
}
