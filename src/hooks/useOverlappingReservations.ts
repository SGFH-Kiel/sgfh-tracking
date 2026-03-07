import { useCallback, useEffect, useState } from 'react';
import { Dayjs } from 'dayjs';
import { BoatReservation } from '../types/models';
import { useApp } from '../contexts/AppContext';
import { getReservationConflictResult } from '../domain/reservations';

interface UseOverlappingReservationsProps {
  startTime: Dayjs;
  endTime: Dayjs;
  excludeReservationId?: string;
}

export const useOverlappingReservations = ({ startTime, endTime, excludeReservationId }: UseOverlappingReservationsProps) => {
  const { database } = useApp();
  const [overlapping, setOverlapping] = useState<BoatReservation[]>([]);
  const [warningOverlaps, setWarningOverlaps] = useState<BoatReservation[]>([]);

  const hasOverlappingReservations = useCallback(async (boatId?: string): Promise<[boolean, BoatReservation[], BoatReservation[]]> => {
    try {
      const overlapping = await database.query<BoatReservation>('boatReservations', [
        { field: 'startTime', operator: 'lte', value: endTime.toDate() },
        { field: 'endTime', operator: 'gte', value: startTime.toDate() }
      ]);

      if (!boatId) {
        const filtered = overlapping.filter((reservation) => reservation.id !== excludeReservationId);
        return [filtered.length > 0, filtered, []];
      }

      const conflicts = getReservationConflictResult(
        overlapping,
        boatId,
        startTime.toDate(),
        endTime.toDate(),
        excludeReservationId,
      );

      return [conflicts.hardConflicts.length > 0, conflicts.hardConflicts, conflicts.warningConflicts];
    } catch (error) {
      console.error('Error checking overlapping reservations:', error);
      return [false, [], []];
    }
  }, [database, startTime, endTime, excludeReservationId]);

  useEffect(() => {
    async function checkOverlapping() {
      const hasReservations = await hasOverlappingReservations();
      setOverlapping(hasReservations[1]);
      setWarningOverlaps(hasReservations[2]);
    }
    checkOverlapping();
  }, [hasOverlappingReservations, startTime, endTime, excludeReservationId]);

  return {
    hasOverlappingReservations,
    overlappingReservations: overlapping,
    warningReservations: warningOverlaps,
  };
};
