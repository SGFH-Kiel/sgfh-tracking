import { DatabaseProvider } from '../services/interfaces/database';
import { User, WorkAppointment, WorkParticipant } from '../types/models';
import { writeActivityLog } from './activityLog';

export type ParticipantStatus = WorkParticipant['status'];

/** Setzt den Status eines Teilnehmers inkl. Bestätigungs-Metadaten (rein, ohne Datenbank). */
export function applyParticipantStatus(participant: WorkParticipant, status: ParticipantStatus, actor: Pick<User, 'id' | 'displayName'>, now: Date = new Date()): WorkParticipant {
  const next: WorkParticipant = { ...participant, status, updatedAt: now };
  if (status === 'confirmed') {
    next.confirmedByUserId = actor.id;
    next.confirmedByUserName = actor.displayName;
    next.confirmedAt = now;
  } else {
    // Bestätigungs-Metadaten beim Zurücksetzen oder Ablehnen entfernen
    delete next.confirmedByUserId;
    delete next.confirmedByUserName;
    delete next.confirmedAt;
  }
  return next;
}

/**
 * Ändert den Status eines Teilnehmers (bestätigen, ablehnen, Freigabe zurücknehmen) auf Basis des aktuellen
 * Dokumentstands und protokolliert die Änderung. Gemeinsame Aktion für alle Oberflächen.
 */
export async function setParticipantStatus(
  database: DatabaseProvider,
  appointmentId: string,
  userId: string,
  status: ParticipantStatus,
  actor: Pick<User, 'id' | 'displayName'>,
): Promise<void> {
  const latest = await database.getDocument<WorkAppointment>('workAppointments', appointmentId);
  if (!latest) {
    throw new Error('Arbeitstermin nicht gefunden');
  }
  const target = latest.participants.find((participant) => participant.userId === userId);
  if (!target) {
    throw new Error('Teilnehmer nicht gefunden');
  }
  const now = new Date();
  const participants = latest.participants.map((participant) => (
    participant.userId === userId ? applyParticipantStatus(participant, status, actor, now) : participant
  ));
  await database.updateDocument<WorkAppointment>('workAppointments', appointmentId, { participants });
  await writeActivityLog(database, {
    type: 'workHour.updated',
    entityId: appointmentId,
    entityType: 'workHour',
    actorId: actor.id,
    actorName: actor.displayName,
    details: {
      action: 'participant_status_changed',
      title: latest.title,
      targetUserId: userId,
      targetUserName: target.userName,
      previousStatus: target.status,
      newStatus: status,
    },
  });
}
