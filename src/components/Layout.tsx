import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Button,
  Breadcrumbs,
  Link as MuiLink,
  Stack,
  Badge,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import { useApp } from '../contexts/AppContext';
import { usePageTitle } from '../contexts/PageTitleContext';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { CalendarTabs } from './Calendar/CalendarTabs';
import { BoatList } from './Boats/BoatList';
import { MemberList } from './Members/MemberList';
import { WorkHoursTracker } from './Members/WorkHoursTracker';
import { SystemConfig } from './Admin/SystemConfig';
import { ActivityTrackingView } from './Admin/ActivityTrackingView';
import { Handyman } from '@mui/icons-material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { UserGuide } from './Onboarding/UserGuide';
import { UserPreferencesDialog } from './UserPreferencesDialog';
import { isSeasonModelActive } from '../domain/seasons';
import { useIsMobile } from '../hooks/useIsMobile';
import { useChangelog } from '../hooks/useChangelog';
import { ChangelogView } from './Changelog/ChangelogView';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import LogoutIcon from '@mui/icons-material/Logout';

export const Layout: React.FC = () => {
  const { isAdmin, isSuperAdmin, signOut, currentUser, systemConfig } = useApp();
  const isMobile = useIsMobile();
  const { unseen: unseenChangelog } = useChangelog();
  const unseenChangelogCount = currentUser ? unseenChangelog.length : 0;
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(Boolean(currentUser && (!currentUser.onboardingState || currentUser.onboardingState === 'not_started')));
  const [prefsOpen, setPrefsOpen] = useState(false);
  const { breadcrumbs } = usePageTitle();
  const currentPath = useLocation().pathname;

  useEffect(() => {
    if (currentUser && (!currentUser.onboardingState || currentUser.onboardingState === 'not_started')) {
      setGuideOpen(true);
    }
  }, [currentUser]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Kalender', icon: <CalendarMonthIcon />, path: '/' },
    { text: 'Arbeitsstunden', icon: <Handyman />, path: '/hours' },
    {
      text: 'Neuigkeiten',
      icon: (
        <Badge color="error" badgeContent={unseenChangelogCount} invisible={unseenChangelogCount === 0}>
          <NewReleasesIcon />
        </Badge>
      ),
      path: '/changelog',
    },
    ...(isAdmin ? [
      { text: 'Bootsverwaltung', icon: <DirectionsBoatIcon />, path: '/boats' },
      { text: 'Mitgliederverwaltung', icon: <GroupIcon />, path: '/members' },
      { text: 'Aktivitätsverfolgung', icon: <TrackChangesIcon />, path: '/tracking' },
    ] : []),
    // Admins erhalten nach Aktivierung des Saisonmodells Zugriff auf die Saisonsteuerung.
    ...(isSuperAdmin || (isAdmin && isSeasonModelActive(systemConfig)) ? [
      { text: isSuperAdmin ? 'Systemeinstellungen' : 'Saisonsteuerung', icon: <SettingsIcon />, path: '/settings' },
    ] : []),
  ];

  const toggleDrawer = () => setDrawerOpen(!drawerOpen);

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          borderRadius: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: (theme) => `linear-gradient(to right, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
          '& .MuiToolbar-root': {
            minHeight: { xs: '56px', sm: '64px' },
            px: { xs: 1, sm: 2 }
          }
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            aria-label={unseenChangelogCount > 0 ? `Menü (${unseenChangelogCount} Neuigkeiten)` : 'Menü'}
            sx={{
              mr: { xs: 1, sm: 2 },
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <Badge color="error" variant="dot" invisible={unseenChangelogCount === 0} overlap="circular">
              <MenuIcon />
            </Badge>
          </IconButton>
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <Breadcrumbs
              sx={{
                '& .MuiBreadcrumbs-ol': {
                  flexWrap: 'nowrap',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiBreadcrumbs-li': {
                  display: 'flex',
                  alignItems: 'center',
                },
              }}
              separator={<NavigateNextIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}
              aria-label="breadcrumb"
            >
              {(!isMobile || breadcrumbs.length === 0) && (
                <MuiLink
                  key={'home'}
                  color="inherit"
                  variant='h5'
                  onClick={() => navigate('/')}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', cursor: 'pointer' }}
                >
                  SGFH
                </MuiLink>
              )}
              {breadcrumbs.map((crumb, index) => (
                crumb.href ? (
                  <MuiLink
                    key={index}
                    color="inherit"
                    href={crumb.href}
                    sx={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none' }}
                  >
                    {crumb.text}
                  </MuiLink>
                ) : (
                  <Typography key={index} noWrap sx={{ color: index === breadcrumbs.length - 1 ? 'white' : 'rgba(255, 255, 255, 0.7)', fontWeight: { xs: 500, sm: 400 } }}>
                    {crumb.text}
                  </Typography>
                )
              ))}
            </Breadcrumbs>
          </Box>
          <Stack direction="row" spacing={{ xs: 0, sm: 1 }} sx={{ flexShrink: 0 }}>
            <IconButton
              onClick={() => setPrefsOpen(true)}
              sx={{
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
              title={currentUser?.displayName}
              aria-label="Meine Einstellungen"
            >
              <AccountCircleIcon />
            </IconButton>
            {isMobile ? (
              <>
                <IconButton onClick={() => setGuideOpen(true)} sx={{ color: 'white' }} aria-label="Hilfe" title="Hilfe">
                  <HelpOutlineIcon />
                </IconButton>
                <IconButton onClick={handleLogout} sx={{ color: 'white' }} aria-label="Abmelden" title="Abmelden">
                  <LogoutIcon />
                </IconButton>
              </>
            ) : (
              <>
                <Button
                  color="inherit"
                  onClick={() => setGuideOpen(true)}
                  startIcon={<HelpOutlineIcon />}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}>
                  Hilfe
                </Button>
                <Button
                  color="inherit"
                  onClick={handleLogout}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}>
                  Abmelden
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        PaperProps={{
          sx: {
            background: (theme) => theme.palette.background.default,
            borderRight: (theme) => `1px solid ${theme.palette.primary.light}20`,
          }
        }}
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
      >
        <Box 
          sx={{ 
            width: 250,
            pt: 8,
            '& .MuiListItem-root': {
              mb: 1,
              p: 0,
              width: '100%',
              '&:hover': {
                backgroundColor: (theme) => theme.palette.primary.light + '20',
              },
              '&.Mui-selected': {
                backgroundColor: (theme) => theme.palette.primary.light + '30',
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.primary.light + '40',
                },
              },
            },
            '& .MuiListItemIcon-root': {
              minWidth: 40,
              color: (theme) => theme.palette.primary.main,
            },
          }} 
          role="presentation" 
          onClick={toggleDrawer}
        >
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text}>
                <ListItemButton
                  selected={currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))}
                  onClick={() => navigate(item.path)}
                >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 0, sm: 2 },
          width: '100%',
          mt: { xs: 6, sm: 8 }
        }}
      >
        <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 3 }, mb: { xs: 3, sm: 4 }, px: { xs: 1, sm: 3 } }}>
          <Routes>
            <Route path="/" element={<CalendarTabs />} />
            <Route path="/hours" element={<WorkHoursTracker />} />
            <Route path="/changelog" element={<ChangelogView />} />
            {isAdmin && (
              <>
                <Route path="/boats" element={<BoatList />} />
                <Route path="/members" element={<MemberList />} />
                <Route path="/tracking" element={<ActivityTrackingView />} />
              </>
            )}
            {(isSuperAdmin || (isAdmin && isSeasonModelActive(systemConfig))) && (
              <Route path="/settings" element={<SystemConfig />} />
            )}
          </Routes>
        </Container>
      </Box>
      <UserGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
      <UserPreferencesDialog open={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </Box>
  );
};
