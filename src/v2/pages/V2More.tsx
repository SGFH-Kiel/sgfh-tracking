import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Paper } from '@mui/material';
import {
  DirectionsBoat as BoatIcon,
  GetApp as InstallIcon,
  Group as MembersIcon,
  Groups as MemberHoursIcon,
  HelpOutline as HelpIcon,
  Logout as LogoutIcon,
  NewReleases as NewsIcon,
  Settings as SettingsIcon,
  SwapHoriz as SwitchIcon,
  TrackChanges as TrackingIcon,
  Tune as PreferencesIcon,
} from '@mui/icons-material';
import { useApp } from '../../contexts/AppContext';
import { useChangelog } from '../../hooks/useChangelog';
import { isSeasonModelActive } from '../../domain/seasons';
import { useInstallAction } from '../../pwa/PwaComponents';
import { V2Page } from '../components/V2Page';

interface V2MoreProps {
  onOpenPreferences: () => void;
  onOpenGuide: () => void;
  onSwitchToClassic: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
    <List subheader={<ListSubheader sx={{ bgcolor: 'transparent', lineHeight: '40px' }}>{title}</ListSubheader>} disablePadding>
      {children}
    </List>
  </Paper>
);

/** „Mehr“ auf dem Smartphone: alle Ziele, die nicht in der Navigationsleiste stehen. */
export const V2More: React.FC<V2MoreProps> = ({ onOpenPreferences, onOpenGuide, onSwitchToClassic }) => {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, isAnyBootswart, systemConfig, signOut } = useApp();
  const isReviewer = isAdmin || isAnyBootswart;
  const { unseen } = useChangelog();
  const { installable, install, dialog } = useInstallAction();
  const canSeeSettings = isSuperAdmin || (isAdmin && isSeasonModelActive(systemConfig));

  const item = (label: string, icon: React.ReactNode, onClick: () => void, secondary?: string) => (
    <ListItemButton onClick={onClick} sx={{ minHeight: 56 }}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={label} secondary={secondary} />
    </ListItemButton>
  );

  return (
    <V2Page title="Mehr">
      <Section title="Allgemein">
        {item('Neuigkeiten', <Badge color="error" badgeContent={unseen.length} invisible={unseen.length === 0}><NewsIcon /></Badge>, () => navigate('/changelog'))}
        {item('Meine Einstellungen', <PreferencesIcon />, onOpenPreferences)}
        {item('Hilfe', <HelpIcon />, onOpenGuide)}
        {installable && item('App installieren', <InstallIcon />, install, 'Eigenes Symbol, Vollbild, angemeldet bleiben')}
      </Section>

      {(isReviewer || canSeeSettings) && (
        <Section title="Verwaltung">
          {isReviewer && item('Mitgliederstunden', <MemberHoursIcon />, () => navigate('/member-hours'), 'Stand aller Mitglieder, Import und Export')}
          {isAdmin && item('Boote', <BoatIcon />, () => navigate('/boats'))}
          {isAdmin && item('Mitglieder', <MembersIcon />, () => navigate('/members'))}
          {isAdmin && item('Aktivitäten', <TrackingIcon />, () => navigate('/tracking'))}
          {canSeeSettings && item(isSuperAdmin ? 'Systemeinstellungen' : 'Saisonsteuerung', <SettingsIcon />, () => navigate('/settings'))}
        </Section>
      )}

      <Section title="Konto">
        {item('Zur klassischen Ansicht', <SwitchIcon />, onSwitchToClassic, 'Neue Oberfläche ausschalten')}
        {item('Abmelden', <LogoutIcon />, () => signOut())}
      </Section>
      {dialog}
    </V2Page>
  );
};
