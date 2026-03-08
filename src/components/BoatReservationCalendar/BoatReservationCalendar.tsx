import React, { useCallback, useState, useEffect } from 'react';
import { Alert, AlertTitle } from '@mui/material';
import { useMemberReservationEligibility } from '../../hooks/memberHooks';
import {
  Paper,
  Box,
  Chip,
} from '@mui/material';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs'
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useApp } from '../../contexts/AppContext';
import { BoatReservation, CalendarView } from '../../types/models';
import { syncPublicReservationFeed } from '../../domain/reservationSync';
import { getContrastColor } from '../../utils/colors';
import { ReservationDialog } from './ReservationDialog';
import { ReservationDetailsDialog } from './ReservationDetailsDialog';

const localizer = dayjsLocalizer(dayjs);

export const BoatReservationCalendar: React.FC = () => {
  const { database, currentUser, boats, systemConfig } = useApp();
  const { canReserve, missingRequirements } = useMemberReservationEligibility();
  const [reservations, setReservations] = useState<BoatReservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<BoatReservation | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  const defaultView: CalendarView =
    currentUser?.preferences?.calendarDefaults?.vormerkbuch ??
    systemConfig.calendarDefaults?.vormerkbuch ??
    'week';
  const [selectedView, setSelectedView] = useState<CalendarView>(defaultView);

  useEffect(() => {
    setSelectedView(
      currentUser?.preferences?.calendarDefaults?.vormerkbuch ??
      systemConfig.calendarDefaults?.vormerkbuch ??
      'week'
    );
  }, [currentUser?.preferences?.calendarDefaults?.vormerkbuch, systemConfig.calendarDefaults?.vormerkbuch]);

  const fetchData = useCallback(async () => {
    try {
      const fetchedReservations = await database.getDocuments<BoatReservation>('boatReservations');
      setReservations(fetchedReservations);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [database]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (!currentUser) return;
    setSelectedSlot({ start, end });
    setIsReservationDialogOpen(true);
  };

  const handleSelectEvent = (reservation: BoatReservation) => {
    if (!currentUser) return;
    setSelectedReservation(reservation);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setIsDetailsDialogOpen(false);
    setIsReservationDialogOpen(false);
    setSelectedReservation(null);
    setSelectedSlot(null);
  };

  const handleReservationUpdate = () => {
    fetchData();
    handleCloseDialogs();
  };

  return (
    <Paper sx={{ p: { xs: 1, sm: 2 } }}>
      {!canReserve && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle sx={{ mb: 2 }}>Finale Reservierung aktuell nicht möglich</AlertTitle>
          Sie können trotzdem eine unverbindliche Vormerkung anlegen. Für eine finale Reservierung fehlen aktuell noch:
          <ul>
            {missingRequirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Box sx={{ 
          mb: { xs: 1, sm: 2 }, 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 0.5,
          mx: { xs: -1, sm: 0 },
          px: { xs: 1, sm: 0 },
          pb: 1,
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 3,
          }
        }}>
        {boats.sort((a, b) => a.name.localeCompare(b.name)).map((boat) => (
          <Box
            key={boat.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              px: 1,
              py: 0.5,
              fontSize: '0.875rem',
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: boat.color || '#ccc',
              }}
            />
            {boat.name}
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          position: 'relative',
        }}
      >
        <Calendar
          date={displayDate}
          localizer={localizer}
          events={reservations}
          longPressThreshold={100}
          eventPropGetter={(event, ...props) => {
            const boat = boats.find(b => b.id === event.boatId);
            const baseColor = event.status === 'draft'
              ? '#ed6c02'
              : event.status === 'pending'
                ? '#0288d1'
                : boat?.color || '#2e7d32';
            return {
              ...props,
              style: {
                backgroundColor: baseColor,
                borderColor: baseColor,
                color: getContrastColor(baseColor),
                opacity: event.status === 'cancelled' ? 0.5 : 1,
                borderStyle: event.visibility === 'public' ? 'dashed' : 'solid',
              },
            };
          }}
          components={{
            event: ({ event }) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.title}
                </Box>
                {event.visibility === 'public' && <Chip size="small" label="Öffentlich" color="secondary" sx={{ height: 18 }} />}
                {event.status === 'draft' && <Chip size="small" label="Vormerkung" color="warning" sx={{ height: 18 }} />}
              </Box>
            )
          }}
          startAccessor="startTime"
          endAccessor="endTime"
          style={{ height: 'calc(100vh - 250px)', minHeight: 400 }}
          selectable={Boolean(currentUser)}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          view={selectedView}
          views={['month', 'week', 'day']}
          onNavigate={(range) => {
            setDisplayDate(range);
          }}
          onView={(v) => setSelectedView(v as CalendarView)}
          titleAccessor="title"
          messages={{
            next: 'Weiter',
            previous: 'Zurück',
            today: 'Heute',
            month: 'Monat',
            week: 'Woche',
            day: 'Tag',
          }}
        />
      </Box>

      {selectedReservation && (
        <ReservationDetailsDialog
          open={isDetailsDialogOpen}
          onClose={handleCloseDialogs}
          reservation={selectedReservation}
          onUpdate={handleReservationUpdate}
          onCopy={async (copies) => {
            await Promise.all(copies.map(async (copy) => {
              const copyWithSnapshot = {
                ...copy,
                userId: currentUser!.id,
                userName: currentUser!.displayName,
                eligibilitySnapshot: {
                  feesPaid: currentUser?.feesPaid ?? false,
                  skipHours: currentUser?.skipHours === true,
                  workHoursMet: canReserve,
                },
              };
              const newId = await database.addDocument('boatReservations', copyWithSnapshot);
              await syncPublicReservationFeed(database, { ...copyWithSnapshot, id: newId }, boats);
            }));
            await fetchData();
          }}
        />
      )}

      {selectedSlot && (
        <ReservationDialog
          open={isReservationDialogOpen}
          onClose={handleCloseDialogs}
          startTime={selectedSlot.start}
          endTime={selectedSlot.end}
          onUpdate={handleReservationUpdate}
        />
      )}
    </Paper>
  );
};
