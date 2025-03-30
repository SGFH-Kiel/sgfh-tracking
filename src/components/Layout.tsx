import React, { useState } from 'react';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import { useApp } from '../contexts/AppContext';
import { usePageTitle } from '../contexts/PageTitleContext';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { CalendarTabs } from './Calendar/CalendarTabs';
import { BoatList } from './Boats/BoatList';
import { MemberList } from './Members/MemberList';
import { WorkHoursTracker } from './Members/WorkHoursTracker';
import { SystemConfig } from './Admin/SystemConfig';
import { Handyman } from '@mui/icons-material';

export const Layout: React.FC = () => {
  const { isAdmin, isSuperAdmin, signOut } = useApp();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { breadcrumbs } = usePageTitle();
  const currentPath = useLocation().pathname;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Kalender', icon: <CalendarMonthIcon />, path: '/' },
    { text: 'Arbeitsstunden', icon: <Handyman />, path: '/hours' },
    ...(isAdmin ? [
      { text: 'Bootsverwaltung', icon: <DirectionsBoatIcon />, path: '/boats' },
      { text: 'Mitgliederverwaltung', icon: <GroupIcon />, path: '/members' },
    ] : []),
    ...(isSuperAdmin ? [
      { text: 'Systemeinstellungen', icon: <SettingsIcon />, path: '/settings' },
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
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            sx={{ 
              mr: 2,
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />}
              aria-label="breadcrumb"
              sx={{
                '& .MuiBreadcrumbs-ol': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiBreadcrumbs-li': {
                  display: 'flex',
                  alignItems: 'center',
                },
              }}
            >
              <MuiLink
                key={'home'}
                color="inherit"
                variant='h5'
                onClick={() => navigate('/')} 
                sx={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', cursor: 'pointer' }}
              >
                SGFH
              </MuiLink>
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
                  <Typography key={index} sx={{ color: index === breadcrumbs.length - 1 ? 'white' : 'rgba(255, 255, 255, 0.7)' }}>
                    {crumb.text}
                  </Typography>
                )
              ))}
            </Breadcrumbs>
          </Box>
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
          p: 3,
          width: '100%',
          mt: 8
        }}
      >
        <Container maxWidth="lg" sx={{ mt: 3, mb: 4, px: { xs: 2, sm: 3 } }}>
          <Routes>
            <Route path="/" element={<CalendarTabs />} />
            <Route path="/hours" element={<WorkHoursTracker />} />
            {isAdmin && (
              <>
                <Route path="/boats" element={<BoatList />} />
                <Route path="/members" element={<MemberList />} />
              </>
            )}
            {isSuperAdmin && (
              <Route path="/settings" element={<SystemConfig />} />
            )}
          </Routes>
        </Container>
      </Box>
    </Box>
  );
};
