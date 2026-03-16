import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Button,
  OutlinedInput,
  ListItemText,
  Checkbox,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useApp } from '../../contexts/AppContext';
import { QueryFilter } from '../../services/interfaces/database';
import { usePageTitle } from '../../contexts/PageTitleContext';
import {
  ActivityLogEntry,
  ActivityEntityType,
  ActivityType,
  BoatReservation,
  ReservationStatus,
  ReservationVisibility,
  WorkAppointment,
  User,
} from '../../types/models';

type EntityTypeFilter = ActivityEntityType | 'all';

const ENTITY_TYPE_LABELS: Record<ActivityEntityType, string> = {
  reservation: 'Bootsreservierung',
  workHour: 'Arbeitsstunden',
  boat: 'Boot',
  member: 'Mitglied',
};

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  'reservation.created': 'Reservierung erstellt',
  'reservation.status_changed': 'Status geändert',
  'reservation.deleted': 'Reservierung gelöscht',
  'workHour.created': 'Arbeitsstunden eingetragen',
  'workHour.updated': 'Arbeitsstunden bearbeitet',
  'workHour.deleted': 'Arbeitsstunden gelöscht',
  'boat.created': 'Boot erstellt',
  'boat.updated': 'Boot bearbeitet',
  'boat.deleted': 'Boot gelöscht',
  'member.created': 'Mitglied erstellt',
  'member.updated': 'Mitglied bearbeitet',
  'member.deactivated': 'Mitglied deaktiviert',
  'member.deleted': 'Mitglied gelöscht',
};

const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  draft: 'Vormerkung',
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
  cancelled: 'Storniert',
};

const RESERVATION_STATUS_COLORS: Record<ReservationStatus, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  draft: 'warning',
  pending: 'info',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

const ALL_ACTIVITY_TYPES: ActivityType[] = [
  'reservation.created',
  'reservation.status_changed',
  'reservation.deleted',
  'workHour.created',
  'workHour.updated',
  'workHour.deleted',
  'boat.created',
  'boat.updated',
  'boat.deleted',
  'member.created',
  'member.updated',
  'member.deactivated',
  'member.deleted',
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

export const ActivityTrackingView: React.FC = () => {
  const { database, boats } = useApp();
  const { setBreadcrumbs } = usePageTitle();

  useEffect(() => {
    setBreadcrumbs([{ text: 'Aktivitätsverfolgung' }]);
  }, [setBreadcrumbs]);

  const [activeTab, setActiveTab] = useState(0);

  // ── Current State List state ────────────────────────────────────────────────
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypeFilter>('reservation');
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [dateTo, setDateTo] = useState<Dayjs | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus[]>([]);
  const [visibilityFilter, setVisibilityFilter] = useState<ReservationVisibility | 'all'>('all');

  const [reservations, setReservations] = useState<BoatReservation[]>([]);
  const [workAppointments, setWorkAppointments] = useState<WorkAppointment[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── Audit Log state ────────────────────────────────────────────────────────
  const [logActivityTypes, setLogActivityTypes] = useState<ActivityType[]>([]);
  const [logDateFrom, setLogDateFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [logDateTo, setLogDateTo] = useState<Dayjs | null>(null);
  const [logEntries, setLogEntries] = useState<ActivityLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const fetchCurrentStateData = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const dateFilters: QueryFilter[] = [];
      if (dateFrom) {
        dateFilters.push({ field: 'startTime', operator: 'gte', value: dateFrom.startOf('day').toDate() });
      }
      if (dateTo) {
        dateFilters.push({ field: 'startTime', operator: 'lte', value: dateTo.endOf('day').toDate() });
      }
      const [res, work, mem] = await Promise.all([
        database.getDocuments<BoatReservation>('boatReservations', dateFilters),
        database.getDocuments<WorkAppointment>('workAppointments', dateFilters),
        database.getDocuments<User>('users'),
      ]);
      setReservations(res);
      setWorkAppointments(work);
      setMembers(mem);
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setListError('Fehler beim Laden der Daten.');
    } finally {
      setListLoading(false);
    }
  }, [database, dateFrom, dateTo]);

  const fetchLogData = useCallback(async () => {
    setLogLoading(true);
    setLogError(null);
    try {
      const filters: QueryFilter[] = [];
      if (logDateFrom) {
        filters.push({ field: 'timestamp', operator: 'gte', value: logDateFrom.startOf('day').toDate() });
      }
      if (logDateTo) {
        filters.push({ field: 'timestamp', operator: 'lte', value: logDateTo.endOf('day').toDate() });
      }
      const entries = await database.getDocuments<ActivityLogEntry>('activityLog', filters);
      setLogEntries(entries);
    } catch (err) {
      console.error('Error fetching activity log:', err);
      setLogError('Fehler beim Laden des Aktivitätslogs.');
    } finally {
      setLogLoading(false);
    }
  }, [database, logDateFrom, logDateTo]);

  useEffect(() => {
    fetchCurrentStateData();
  }, [fetchCurrentStateData]);

  useEffect(() => {
    if (activeTab === 1) {
      fetchLogData();
    }
  }, [activeTab, fetchLogData]);

  const boatName = useCallback(
    (boatId?: string) => boats.find((b) => b.id === boatId)?.name ?? boatId ?? '—',
    [boats],
  );

  // ── Filtered current state data ────────────────────────────────────────────
  const filteredReservations = useMemo(() => {
    return [...reservations]
      .filter((r) => {
        if (statusFilter.length > 0 && !statusFilter.includes(r.status)) return false;
        if (visibilityFilter !== 'all' && r.visibility !== visibilityFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [reservations, statusFilter, visibilityFilter]);

  const filteredWorkAppointments = useMemo(() => {
    return [...workAppointments]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [workAppointments]);

  const filteredMembers = useMemo(() => {
    return [...members].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [members]);

  const filteredBoats = useMemo(() => {
    return [...boats].sort((a, b) => a.name.localeCompare(b.name));
  }, [boats]);

  // ── Filtered audit log ─────────────────────────────────────────────────────
  const filteredLogEntries = useMemo(() => {
    return [...logEntries]
      .filter((e) => logActivityTypes.length === 0 || logActivityTypes.includes(e.type))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logEntries, logActivityTypes]);

  // ── Date filter row ────────────────────────────────────────────────────────
  const renderDateFilters = (
    from: Dayjs | null,
    setFrom: (v: Dayjs | null) => void,
    to: Dayjs | null,
    setTo: (v: Dayjs | null) => void,
  ) => (
    <>
      <DatePicker
        label="Von"
        value={from}
        onChange={setFrom}
        slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
      />
      <DatePicker
        label="Bis"
        value={to}
        onChange={setTo}
        slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
      />
    </>
  );

  return (
    <Paper sx={{ p: { xs: 1, sm: 2 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Aktivitätsverfolgung</Typography>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={activeTab === 0 ? fetchCurrentStateData : fetchLogData}
          variant="outlined"
        >
          Aktualisieren
        </Button>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        <Tab label="Datenliste" />
        <Tab label="Aktivitätslog" />
      </Tabs>

      {/* ── TAB 0: Current State List ────────────────────────────────────────── */}
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Entitätstyp</InputLabel>
            <Select
              value={entityTypeFilter}
              label="Entitätstyp"
              onChange={(e) => setEntityTypeFilter(e.target.value as EntityTypeFilter)}
            >
              <MenuItem value="all">Alle</MenuItem>
              {(Object.entries(ENTITY_TYPE_LABELS) as [ActivityEntityType, string][]).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {renderDateFilters(dateFrom, setDateFrom, dateTo, setDateTo)}

          {(entityTypeFilter === 'reservation' || entityTypeFilter === 'all') && (
            <>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  multiple
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value as ReservationStatus[])}
                  input={<OutlinedInput label="Status" />}
                  renderValue={(selected) =>
                    (selected as ReservationStatus[]).map((s) => RESERVATION_STATUS_LABELS[s]).join(', ')
                  }
                >
                  {(Object.entries(RESERVATION_STATUS_LABELS) as [ReservationStatus, string][]).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      <Checkbox checked={statusFilter.includes(key)} />
                      <ListItemText primary={label} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Sichtbarkeit</InputLabel>
                <Select
                  value={visibilityFilter}
                  label="Sichtbarkeit"
                  onChange={(e) => setVisibilityFilter(e.target.value as ReservationVisibility | 'all')}
                >
                  <MenuItem value="all">Alle</MenuItem>
                  <MenuItem value="private">Privat</MenuItem>
                  <MenuItem value="public">Öffentlich</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </Box>

        {listLoading && <CircularProgress size={24} />}
        {listError && <Alert severity="error">{listError}</Alert>}

        {!listLoading && !listError && (
          <>
            {(entityTypeFilter === 'reservation' || entityTypeFilter === 'all') && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Bootsreservierungen ({filteredReservations.length})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Titel</TableCell>
                        <TableCell>Boot</TableCell>
                        <TableCell>Mitglied</TableCell>
                        <TableCell>Start</TableCell>
                        <TableCell>Ende</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Sichtbarkeit</TableCell>
                        <TableCell>Aktualisiert</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredReservations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">Keine Einträge gefunden.</TableCell>
                        </TableRow>
                      ) : (
                        filteredReservations
                          .map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{r.title}</TableCell>
                              <TableCell>{boatName(r.boatId)}</TableCell>
                              <TableCell>{r.userName}</TableCell>
                              <TableCell>{dayjs(r.startTime).format('DD.MM.YYYY HH:mm')}</TableCell>
                              <TableCell>{dayjs(r.endTime).format('DD.MM.YYYY HH:mm')}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={RESERVATION_STATUS_LABELS[r.status]}
                                  color={RESERVATION_STATUS_COLORS[r.status]}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip size="small" label={r.visibility === 'public' ? 'Öffentlich' : 'Privat'} variant="outlined" />
                              </TableCell>
                              <TableCell>{dayjs(r.updatedAt).format('DD.MM.YYYY HH:mm')}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {(entityTypeFilter === 'workHour' || entityTypeFilter === 'all') && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Arbeitsstunden ({filteredWorkAppointments.length})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Titel</TableCell>
                        <TableCell>Boot</TableCell>
                        <TableCell>Start</TableCell>
                        <TableCell>Ende</TableCell>
                        <TableCell>Teilnehmer</TableCell>
                        <TableCell>Erstellt von</TableCell>
                        <TableCell>Aktualisiert</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredWorkAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">Keine Einträge gefunden.</TableCell>
                        </TableRow>
                      ) : (
                        filteredWorkAppointments
                          .map((w) => (
                            <TableRow key={w.id}>
                              <TableCell>{w.title}</TableCell>
                              <TableCell>{boatName(w.boatId)}</TableCell>
                              <TableCell>{dayjs(w.startTime).format('DD.MM.YYYY HH:mm')}</TableCell>
                              <TableCell>{dayjs(w.endTime).format('DD.MM.YYYY HH:mm')}</TableCell>
                              <TableCell>{w.participants.length}</TableCell>
                              <TableCell>{w.createdByUserName ?? '—'}</TableCell>
                              <TableCell>{dayjs(w.updatedAt).format('DD.MM.YYYY HH:mm')}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {(entityTypeFilter === 'boat' || entityTypeFilter === 'all') && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Boote ({filteredBoats.length})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Beschreibung</TableCell>
                        <TableCell>Genehmigungspflichtig</TableCell>
                        <TableCell>Gesperrt</TableCell>
                        <TableCell>Erstellt</TableCell>
                        <TableCell>Aktualisiert</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredBoats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">Keine Einträge gefunden.</TableCell>
                        </TableRow>
                      ) : (
                        filteredBoats
                          .map((b) => (
                            <TableRow key={b.id}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: b.color || '#ccc' }} />
                                  {b.name}
                                </Box>
                              </TableCell>
                              <TableCell>{b.description ?? '—'}</TableCell>
                              <TableCell>{b.requiresApproval ? 'Ja' : 'Nein'}</TableCell>
                              <TableCell>{b.blocked ? <Chip size="small" label="Gesperrt" color="error" /> : '—'}</TableCell>
                              <TableCell>{dayjs(b.createdAt).format('DD.MM.YYYY')}</TableCell>
                              <TableCell>{dayjs(b.updatedAt).format('DD.MM.YYYY HH:mm')}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {(entityTypeFilter === 'member' || entityTypeFilter === 'all') && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Mitglieder ({filteredMembers.length})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>E-Mail</TableCell>
                        <TableCell>Rollen</TableCell>
                        <TableCell>Mitgliedsbeitrag</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Erstellt</TableCell>
                        <TableCell>Aktualisiert</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">Keine Einträge gefunden.</TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers
                          .map((m) => (
                            <TableRow key={m.id}>
                              <TableCell>{m.displayName}</TableCell>
                              <TableCell>{m.email}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {m.roles.map((r) => (
                                    <Chip key={r} size="small" label={r} variant="outlined" />
                                  ))}
                                </Box>
                              </TableCell>
                              <TableCell>{m.feesPaid ? 'Bezahlt' : 'Ausstehend'}</TableCell>
                              <TableCell>
                                {m.deactivated
                                  ? <Chip size="small" label="Deaktiviert" color="error" />
                                  : <Chip size="small" label="Aktiv" color="success" />}
                              </TableCell>
                              <TableCell>{dayjs(m.createdAt).format('DD.MM.YYYY')}</TableCell>
                              <TableCell>{dayjs(m.updatedAt).format('DD.MM.YYYY HH:mm')}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}
      </TabPanel>

      {/* ── TAB 1: Audit Log ─────────────────────────────────────────────────── */}
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Aktivitätstyp</InputLabel>
            <Select
              multiple
              value={logActivityTypes}
              label="Aktivitätstyp"
              onChange={(e) => setLogActivityTypes(e.target.value as ActivityType[])}
              input={<OutlinedInput label="Aktivitätstyp" />}
              renderValue={(selected) =>
                (selected as ActivityType[]).length === 0
                  ? 'Alle'
                  : (selected as ActivityType[]).map((t) => ACTIVITY_TYPE_LABELS[t]).join(', ')
              }
            >
              {ALL_ACTIVITY_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  <Checkbox checked={logActivityTypes.includes(type)} />
                  <ListItemText primary={ACTIVITY_TYPE_LABELS[type]} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {renderDateFilters(logDateFrom, setLogDateFrom, logDateTo, setLogDateTo)}
        </Box>

        {logLoading && <CircularProgress size={24} />}
        {logError && <Alert severity="error">{logError}</Alert>}

        {!logLoading && !logError && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {filteredLogEntries.length} Einträge
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Zeitstempel</TableCell>
                    <TableCell>Typ</TableCell>
                    <TableCell>Entität</TableCell>
                    <TableCell>Ausführender</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLogEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">Keine Einträge gefunden.</TableCell>
                    </TableRow>
                  ) : (
                    filteredLogEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {dayjs(entry.timestamp).format('DD.MM.YYYY HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={ACTIVITY_TYPE_LABELS[entry.type]} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {ENTITY_TYPE_LABELS[entry.entityType]}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {entry.entityId}
                          </Typography>
                        </TableCell>
                        <TableCell>{entry.actorName}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Object.entries(entry.details).map(([key, value]) => (
                              <Chip
                                key={key}
                                size="small"
                                label={`${key}: ${String(value)}`}
                                variant="outlined"
                                sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </TabPanel>
    </Paper>
  );
};
