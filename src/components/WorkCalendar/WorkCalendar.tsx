import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Paper } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { useApp } from '../../contexts/AppContext';
import { WorkAppointment } from '../../types/models';
import { AppointmentDialog } from './AppointmentDialog';
import { AppointmentDetailsDialog } from './AppointmentDetailsDialog';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';

const localizer = dayjsLocalizer(dayjs);

dayjs.locale('de');

export const WorkCalendar: React.FC = () => {
  const [appointments, setAppointments] = useState<WorkAppointment[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<WorkAppointment | undefined>();
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedView, setSelectedView] = useState<'month' | 'week' | 'work_week' | 'day' | 'agenda'>('week');
  const { database, currentUser, isAdmin, isAnyBootswart } = useApp();

  const refreshAppointments = useCallback(async () => {
    const aptms = await database.getDocuments<WorkAppointment>('workAppointments');
    setAppointments(aptms.filter(a => !a.private || (a.participants.some(p => p.userId === currentUser?.id))));
    if (selectedAppointment) {
      setSelectedAppointment(aptms.find(a => a.id === selectedAppointment.id));
    }
  }, [database, currentUser, selectedAppointment]);

  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);


  const handleOpenCreateDialog = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end });
    setSelectedAppointment(undefined);
    setCreateDialogOpen(true);
  };

  const handleOpenDetailsDialog = (appointment: WorkAppointment) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  const { startTime, endTime } = useMemo(() => {
    // if start is not 00:00 and end is not 00:00 use start and end times
    if (selectedSlot && selectedSlot.start && selectedSlot.end && (selectedSlot.start.getHours() != 0 || selectedSlot.end.getHours() != 0)) {
      return { startTime: selectedSlot.start, endTime: selectedSlot.end };
    }
    let start = selectedSlot?.start || new Date();
    start.setHours(10, 0, 0, 0);
    let end = selectedSlot?.end || new Date();
    // minus one day because endTime is next day 00:00 by default
    end.setDate(end.getDate() - 1);
    end.setHours(16, 0, 0, 0);
    return { startTime: start, endTime: end };
  }, [selectedSlot]);

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Calendar
          date={displayDate}
          localizer={localizer}
          events={appointments}
          startAccessor="startTime"
          endAccessor="endTime"
          style={{ height: 'calc(100vh - 250px)' }}
          selectable={isAdmin || isAnyBootswart}
          onSelectSlot={handleOpenCreateDialog}
          onSelectEvent={handleOpenDetailsDialog}
          view={selectedView}
          views={['month', 'week', 'day']}
          eventPropGetter={(event: WorkAppointment) => ({
            className: event.private ? 'private-appointment' : undefined,
            style: {
              backgroundColor: event.private ? '#f3e5f5' : '#1976d2',
              color: event.private ? '#9c27b0' : '#fff',
              border: event.private ? '1px solid #9c27b0' : '1px solid #1565c0',
              fontWeight: event.private ? 500 : 400
            }
          })}
          onNavigate={(range) => {
            setDisplayDate(range);
          }}
          onView={setSelectedView}
          titleAccessor="title"
          messages={{
            next: 'Weiter',
            previous: 'Zurück',
            today: 'Heute',
            month: 'Monat',
            week: 'Woche',
            day: 'Tag',
          }}
          dayLayoutAlgorithm="no-overlap"
        />
    </Paper>

      {createDialogOpen && (
        <AppointmentDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSave={async (appointment) => {
            await database.addDocument('workAppointments', appointment);
            setCreateDialogOpen(false);
            await refreshAppointments();
          }}
          startTime={startTime}
          endTime={endTime}
        />
      )}

      {detailsDialogOpen && selectedAppointment && (
        <AppointmentDetailsDialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          appointment={selectedAppointment}
          onUpdate={async () => {
            await refreshAppointments();
          }}
          onDelete={async () => {
            await database.deleteDocument('workAppointments', selectedAppointment.id);
            setDetailsDialogOpen(false);
            await refreshAppointments();
          }}
        />
      )}
    </>
  );
};
