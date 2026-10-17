import React, { createContext, useContext, useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { BoatReservation, WorkAppointment } from '../../types/models';

interface LiveData {
  appointments: WorkAppointment[];
  reservations: BoatReservation[];
  loading: boolean;
}

const LiveDataContext = createContext<LiveData>({ appointments: [], reservations: [], loading: true });

/**
 * Eine gemeinsame, live aktualisierte Datenquelle für alle v2-Ansichten (Firestore-Listener).
 * Änderungen anderer Nutzer (z. B. eine Bestätigung) erscheinen sofort, ohne erneutes Laden.
 */
export const LiveDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { database, currentUser } = useApp();
  const [appointments, setAppointments] = useState<WorkAppointment[] | null>(null);
  const [reservations, setReservations] = useState<BoatReservation[] | null>(null);

  useEffect(() => {
    if (!currentUser) return undefined;
    const unsubscribeAppointments = database.onCollectionChanged<WorkAppointment>('workAppointments', [], (docs) => {
      // Private Einträge anderer Mitglieder sind für v2-Ansichten nur in der Prüf-Liste relevant – dort filtern die Selektoren.
      setAppointments(docs);
    });
    const unsubscribeReservations = database.onCollectionChanged<BoatReservation>('boatReservations', [], setReservations);
    return () => {
      unsubscribeAppointments();
      unsubscribeReservations();
    };
  }, [database, currentUser]);

  return (
    <LiveDataContext.Provider
      value={{
        appointments: appointments ?? [],
        reservations: reservations ?? [],
        loading: appointments === null || reservations === null,
      }}
    >
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = (): LiveData => useContext(LiveDataContext);
