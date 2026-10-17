import React, { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  DirectionsBoat as BoatIcon,
  FactCheck as ReviewIcon,
Group as MembersIcon,
  Handyman as HoursIcon,
  HelpOutline as HelpIcon,
  Home as HomeIcon,
  Logout as LogoutIcon,
  MoreHoriz as MoreIcon,
  NewReleases as NewsIcon,
  Settings as SettingsIcon,
  SwapHoriz as SwitchIcon,
  Tune as PreferencesIcon,
  TrackChanges as TrackingIcon,
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext';
import { usePageTitle } from '../contexts/PageTitleContext';
import { useChangelog } from '../hooks/useChangelog';
import { useUiVersion } from '../hooks/useUiVersion';
import { isSeasonModelActive } from '../domain/seasons';
import { InstallAppIconButton } from '../pwa/PwaComponents';
import { UserGuide } from '../components/Onboarding/UserGuide';
import { UserPreferencesDialog } from '../components/UserPreferencesDialog';
import { CalendarTabs } from '../components/Calendar/CalendarTabs';
import { ChangelogView } from '../components/Changelog/ChangelogView';
import { BoatList } from '../components/Boats/BoatList';
import { MemberList } from '../components/Members/MemberList';
import { ActivityTrackingView } from '../components/Admin/ActivityTrackingView';
import { SystemConfig } from '../components/Admin/SystemConfig';
import { LiveDataProvider } from './data/LiveDataContext';
import { useReviewCounts } from './hooks/useReviewCounts';
import { V2Overview } from './pages/V2Overview';
import { V2Hours } from './pages/V2Hours';
import { V2Review } from './pages/V2Review';
import { V2More } from './pages/V2More';

const DRAWER_WIDTH = 248;

interface Destination {
  key: string;
  label: string;
  path: string;
  icon: React.ReactElement;
  badge?: number;
}

const initials = (name?: string) => (name || '?').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

/** Rahmen der neuen Oberfläche: Navigationsleiste unten (Smartphone) bzw. Seitenleiste (ab Tablet quer). */
export const V2Shell: React.FC = () => (
  <LiveDataProvider>
    <V2ShellInner />
  </LiveDataProvider>
);

const V2ShellInner: React.FC = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAdmin, isSuperAdmin, isAnyBootswart, systemConfig, signOut } = useApp();
  const { breadcrumbs } = usePageTitle();
  const { unseen } = useChangelog();
  const { setVersion } = useUiVersion();
  const reviewCount = useReviewCounts().total;
// Kurzanleitung wie in v1 automatisch beim ersten Start öffnen
  const [guideOpen, setGuideOpen] = useState(Boolean(currentUser && (!currentUser.onboardingState || currentUser.onboardingState === 'not_started')));
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);

  const isReviewer = isAdmin || isAnyBootswart;
  const canSeeSettings = isSuperAdmin || (isAdmin && isSeasonModelActive(systemConfig));

  const destinations: Destination[] = useMemo(() => [
    { key: 'home', label: 'Übersicht', path: '/', icon: <HomeIcon /> },
    { key: 'calendar', label: 'Kalender', path: '/calendar', icon: <CalendarIcon /> },
    { key: 'hours', label: 'Stunden', path: '/hours', icon: <HoursIcon /> },
    ...(isReviewer ? [{ key: 'review', label: 'Prüfen', path: '/review', icon: <ReviewIcon />, badge: reviewCount }] : []),
    { key: 'more', label: 'Mehr', path: '/more', icon: <MoreIcon />, badge: unseen.length },
  ], [isReviewer, reviewCount, unseen.length]);

  const adminLinks: Destination[] = [
    ...(isAdmin ? [
      { key: 'boats', label: 'Boote', path: '/boats', icon: <BoatIcon /> },
      { key: 'members', label: 'Mitglieder', path: '/members', icon: <MembersIcon /> },
      { key: 'tracking', label: 'Aktivitäten', path: '/tracking', icon: <TrackingIcon /> },
    ] : []),
    ...(canSeeSettings ? [{ key: 'settings', label: isSuperAdmin ? 'Systemeinstellungen' : 'Saisonsteuerung', path: '/settings', icon: <SettingsIcon /> }] : []),
  ];

  const activeKey = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'home';
    const match = [...destinations, ...adminLinks, { key: 'news', path: '/changelog' } as Destination]
      .find((destination) => destination.path !== '/' && path.startsWith(destination.path));
    if (!match) return 'home';
    // Unterseiten aus „Mehr“ markieren auf dem Smartphone den Reiter „Mehr“
    return ['boats', 'members', 'tracking', 'settings', 'news'].includes(match.key) && !isDesktop ? 'more' : match.key;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, destinations, isDesktop]);

  const title = breadcrumbs[breadcrumbs.length - 1]?.text ?? 'SGFH';

  const handleSwitchToClassic = async () => {
    setAccountAnchor(null);
    await setVersion('v1');
    navigate('/');
  };

  const navItem = (destination: Destination) => (
    <ListItemButton
      key={destination.key}
      selected={activeKey === destination.key}
      onClick={() => navigate(destination.path)}
      sx={{ borderRadius: 999, mx: 1, mb: 0.5 }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        <Badge color="error" badgeContent={destination.badge} invisible={!destination.badge}>
          {destination.icon}
        </Badge>
      </ListItemIcon>
      <ListItemText primary={destination.label} />
    </ListItemButton>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'primary.main',
          borderRadius: 0,
          pt: 'env(safe-area-inset-top)',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {isDesktop && (
            <Typography variant="h6" sx={{ color: 'inherit', fontWeight: 700, width: DRAWER_WIDTH - 24, cursor: 'pointer' }} onClick={() => navigate('/')}>
              SGFH
            </Typography>
          )}
          <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1, color: 'inherit', fontWeight: 500 }}>
            {title}
          </Typography>
          <InstallAppIconButton />
          <Tooltip title="Konto">
            <IconButton onClick={(e) => setAccountAnchor(e.currentTarget)} aria-label="Konto und Einstellungen" sx={{ p: 0.5 }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 14 }}>{initials(currentUser?.displayName)}</Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={accountAnchor} open={!!accountAnchor} onClose={() => setAccountAnchor(null)}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">{currentUser?.displayName}</Typography>
          <Typography variant="caption" color="text.secondary">{currentUser?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAccountAnchor(null); setPrefsOpen(true); }}>
          <ListItemIcon><PreferencesIcon fontSize="small" /></ListItemIcon>Meine Einstellungen
        </MenuItem>
        <MenuItem onClick={() => { setAccountAnchor(null); setGuideOpen(true); }}>
          <ListItemIcon><HelpIcon fontSize="small" /></ListItemIcon>Hilfe
        </MenuItem>
        <MenuItem onClick={handleSwitchToClassic}>
          <ListItemIcon><SwitchIcon fontSize="small" /></ListItemIcon>Zur klassischen Ansicht
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAccountAnchor(null); signOut(); }}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>Abmelden
        </MenuItem>
      </Menu>

      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' },
          }}
        >
          <Toolbar />
          <List sx={{ pt: 2 }}>
            {destinations.filter((destination) => destination.key !== 'more').map(navItem)}
            {navItem({ key: 'news', label: 'Neuigkeiten', path: '/changelog', icon: <NewsIcon />, badge: unseen.length })}
          </List>
          {adminLinks.length > 0 && (
            <List subheader={<ListSubheader sx={{ bgcolor: 'transparent' }}>Verwaltung</ListSubheader>}>
              {adminLinks.map(navItem)}
            </List>
          )}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          // Schutz gegen seitliches Überlaufen: sonst verschiebt der Mobilbrowser die fest verankerten Leisten
          overflowX: 'clip',
          px: { xs: 2, sm: 3 },
          pt: { xs: 'calc(72px + env(safe-area-inset-top))', sm: 'calc(88px + env(safe-area-inset-top))' },
          pb: { xs: 'calc(64px + 16px + env(safe-area-inset-bottom))', md: 6 },
        }}
      >
        <Routes>
          <Route path="/" element={<V2Overview />} />
          <Route path="/calendar" element={<CalendarTabs listView />} />
          <Route path="/hours" element={<V2Hours />} />
          {isReviewer && <Route path="/review" element={<V2Review />} />}
          <Route path="/more" element={<V2More onOpenPreferences={() => setPrefsOpen(true)} onOpenGuide={() => setGuideOpen(true)} onSwitchToClassic={handleSwitchToClassic} />} />
          <Route path="/changelog" element={<ChangelogView />} />
          {isAdmin && (
            <>
              <Route path="/boats" element={<BoatList />} />
              <Route path="/members" element={<MemberList />} />
              <Route path="/tracking" element={<ActivityTrackingView />} />
            </>
          )}
          {canSeeSettings && <Route path="/settings" element={<SystemConfig />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      {!isDesktop && (
        <Paper
          elevation={8}
          sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: theme.zIndex.appBar, borderRadius: 0, pb: 'env(safe-area-inset-bottom)' }}
          component="nav"
          aria-label="Hauptnavigation"
        >
          <BottomNavigation
            showLabels
            value={activeKey}
            onChange={(_, key) => {
              const target = destinations.find((destination) => destination.key === key);
              if (target) navigate(target.path);
            }}
            sx={{
              height: 64,
              // gleiche Schriftgröße für aktiv/inaktiv, sonst verschieben sich die Symbole beim Wechsel
              '& .MuiBottomNavigationAction-label, & .MuiBottomNavigationAction-label.Mui-selected': { fontSize: '0.75rem', transition: 'none' },
            }}
          >
            {destinations.map((destination) => (
              <BottomNavigationAction
                key={destination.key}
                value={destination.key}
                label={destination.label}
                icon={
                  <Badge color="error" badgeContent={destination.badge} invisible={!destination.badge} max={99}>
                    {destination.icon}
                  </Badge>
                }
                sx={{ minWidth: 0, px: 0.5 }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}

      <UserGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
      <UserPreferencesDialog open={prefsOpen} onClose={() => setPrefsOpen(false)} />
</Box>
  );
};
