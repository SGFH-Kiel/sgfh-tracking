import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListSubheader,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  DirectionsBoat as BoatIcon,
  ExpandMore as ExpandIcon,
  Handyman as WorkIcon,
  Person as MemberIcon,
  Search as SearchIcon,
  Settings as SystemIcon,
  EventAvailable as ReservationIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { useSnackbar } from 'notistack';
import { ActivityEntityType, ActivityLogEntry, Boat } from '../../types/models';
import { formatActivity, FormattedActivity } from '../../domain/activityFormat';

const CATEGORY: Record<ActivityEntityType, { label: string; icon: React.ReactElement }> = {
  reservation: { label: 'Reservierung', icon: <ReservationIcon fontSize="small" /> },
  workHour: { label: 'Arbeitsstunden', icon: <WorkIcon fontSize="small" /> },
  boat: { label: 'Boot', icon: <BoatIcon fontSize="small" /> },
  member: { label: 'Mitglied', icon: <MemberIcon fontSize="small" /> },
  system: { label: 'System', icon: <SystemIcon fontSize="small" /> },
};

const dayLabel = (date: Date): string => {
  const day = dayjs(date).startOf('day');
  const today = dayjs().startOf('day');
  if (day.isSame(today)) return 'Heute';
  if (day.isSame(today.subtract(1, 'day'))) return 'Gestern';
  return day.locale('de').format('dddd, DD.MM.YYYY');
};

interface Row {
  entry: ActivityLogEntry;
  formatted: FormattedActivity;
}

const LogRow: React.FC<{ row: Row }> = ({ row }) => {
  const { entry, formatted } = row;
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const category = CATEGORY[formatted.category] ?? CATEGORY.system;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(entry.entityId);
      enqueueSnackbar('Objekt-ID kopiert', { variant: 'success', autoHideDuration: 2000 });
    } catch {
      enqueueSnackbar('Kopieren nicht möglich', { variant: 'error' });
    }
  };

  return (
    <>
      <ListItemButton onClick={() => setOpen((value) => !value)} aria-expanded={open} sx={{ alignItems: 'flex-start', gap: 1.5, py: 1 }}>
        <Tooltip title={dayjs(entry.timestamp).format('DD.MM.YYYY HH:mm:ss')}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 42, pt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
            {dayjs(entry.timestamp).format('HH:mm')}
          </Typography>
        </Tooltip>
        <Tooltip title={category.label}>
          <Box sx={{ color: 'primary.main', display: 'flex', pt: 0.25 }} aria-label={category.label}>{category.icon}</Box>
        </Tooltip>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatted.summary}</Typography>
          <Typography variant="caption" color="text.secondary">{entry.actorName}</Typography>
        </Box>
        <ExpandIcon fontSize="small" sx={{ color: 'text.secondary', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', mt: 0.25 }} />
      </ListItemButton>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ pl: { xs: 2, sm: 10 }, pr: 2, pb: 1.5 }}>
          <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'minmax(110px, max-content) 1fr', columnGap: 2, rowGap: 0.5, m: 0 }}>
            {formatted.fields.map((field) => (
              <React.Fragment key={field.label}>
                <Typography component="dt" variant="body2" color="text.secondary">{field.label}</Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0, wordBreak: 'break-word' }}>{field.value}</Typography>
              </React.Fragment>
            ))}
            <Typography component="dt" variant="body2" color="text.secondary">Objekt</Typography>
            <Box component="dd" sx={{ m: 0, display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {category.label} · {entry.entityId}
              </Typography>
              <Tooltip title="Objekt-ID kopieren">
                <IconButton size="small" onClick={copyId} aria-label="Objekt-ID kopieren"><CopyIcon fontSize="inherit" /></IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Button size="small" onClick={() => setShowRaw((value) => !value)} sx={{ mt: 1, px: 0 }}>
            {showRaw ? 'Rohdaten ausblenden' : 'Rohdaten anzeigen'}
          </Button>
          <Collapse in={showRaw} unmountOnExit>
            <Box
              component="pre"
              sx={{ m: 0, mt: 0.5, p: 1.5, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {JSON.stringify({ type: entry.type, entityType: entry.entityType, entityId: entry.entityId, actorId: entry.actorId, details: entry.details }, null, 2)}
            </Box>
          </Collapse>
        </Box>
      </Collapse>
    </>
  );
};

/**
 * Lesbares Aktivitätslog (v2): nach Tag gruppiert, ein Satz pro Ereignis, Details zuklappbar,
 * Rohdaten (JSON) nur auf Wunsch.
 */
export const ActivityLogList: React.FC<{ entries: ActivityLogEntry[]; boats: Boat[] }> = ({ entries, boats }) => {
  const [search, setSearch] = useState('');
  const rows = useMemo<Row[]>(() => {
    const context = { boatName: (id: string) => boats.find((boat) => boat.id === id)?.name };
    return entries.map((entry) => ({ entry, formatted: formatActivity(entry, context) }));
  }, [entries, boats]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(({ entry, formatted }) =>
      [formatted.summary, entry.actorName, ...formatted.fields.map((field) => field.value)].some((text) => text.toLowerCase().includes(term)),
    );
  }, [rows, search]);

  const groups = useMemo(() => {
    const result: { label: string; rows: Row[] }[] = [];
    filtered.forEach((row) => {
      const label = dayLabel(row.entry.timestamp);
      const last = result[result.length - 1];
      if (last && last.label === label) {
        last.rows.push(row);
      } else {
        result.push({ label, rows: [row] });
      }
    });
    return result;
  }, [filtered]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <TextField
        size="small"
        placeholder="Suchen: Person, Titel, Boot …"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        sx={{ maxWidth: 420 }}
      />
      <Typography variant="body2" color="text.secondary">{filtered.length} Einträge</Typography>
      {groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Keine Einträge gefunden.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {groups.map((group) => (
            <List
              key={group.label}
              disablePadding
              subheader={<ListSubheader sx={{ bgcolor: 'grey.50', lineHeight: '36px', fontWeight: 600 }}>{group.label}</ListSubheader>}
            >
              {group.rows.map((row) => <LogRow key={row.entry.id} row={row} />)}
            </List>
          ))}
        </Paper>
      )}
    </Box>
  );
};
