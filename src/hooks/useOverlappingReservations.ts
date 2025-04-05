import { useCallback, useEffect, useState } from 'react';
import { Dayjs } from 'dayjs';
import { BoatReservation } from '../types/models';
import { useApp } from '../contexts/AppContext';

interface UseOverlappingReservationsProps {
  startTime: Dayjs;
  endTime: Dayjs;
  excludeReservationId?: string;
}

export const useOverlappingReservations = ({ startTime, endTime, excludeReservationId }: UseOverlappingReservationsProps) => {
  const { database } = useApp();
  const [overlapping, setOverlapping] = useState<BoatReservation[]>([]);

  const hasOverlappingReservations = useCallback(async (boatId?: string): Promise<[boolean, BoatReservation[]]> => {
    try {
      const overlapping = await database.query<BoatReservation>('boatReservations', [
        { field: 'startTime', operator: 'lte', value: endTime.toDate() },
        { field: 'endTime', operator: 'gte', value: startTime.toDate() }
      ]);

      // Filter out the current reservation when editing
      const filtered = overlapping.filter(reservation => {
        if (excludeReservationId && reservation.id === excludeReservationId) {
          return false;
        }
        return boatId ? reservation.boatId === boatId : true;
      });
      return [filtered.length > 0, filtered];
    } catch (error) {
      console.error('Error checking overlapping reservations:', error);
      return [false, []];
    }
  }, [database, startTime, endTime, excludeReservationId]);

  useEffect(() => {
    async function checkOverlapping() {
      const hasReservations = await hasOverlappingReservations();
      setOverlapping(hasReservations[1]);
    }
    checkOverlapping();
  }, [hasOverlappingReservations, startTime, endTime, excludeReservationId]);

  return {
    hasOverlappingReservations,
    overlappingReservations: overlapping,
  };
};
