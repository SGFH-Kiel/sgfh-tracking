import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useSnackbar } from 'notistack';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Edit as EditIcon,
  Block as BlockIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircleOutline as CheckCircleIcon,
} from '@mui/icons-material';
import { BoatReservation, User, UserRole } from '../../types/models';
import { useApp } from '../../contexts/AppContext';
import { useCalculateWorkHours } from '../../hooks/memberHooks';
import humanizeDuration from 'humanize-duration';

const humanizer = humanizeDuration.humanizer({ language: 'de', round: true, units: ['h'] });

export const MemberList: React.FC = () => {
  const { setBreadcrumbs } = usePageTitle();
  useEffect(() => {
    setBreadcrumbs([
      { text: 'Mitgliederverwaltung' },
    ]);
  }, [setBreadcrumbs]);
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser, isSuperAdmin, isAnyBootswart, createUserAndSendInvite, deactivateUser, deleteUser, activateUser, reloadCurrentUser, database, systemConfig } = useApp();
  const { loading, error, userWorkHours, users, reload } = useCalculateWorkHours();
  const [open, setOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    roles: [UserRole.MEMBER],
    feesPaid: false,
    skipHours: false,
  });

  const handleOpen = (member?: User) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        email: member.email,
        displayName: member.displayName || '',
        roles: member.roles.filter(role => role !== UserRole.APPLICANT),
        feesPaid: member.feesPaid || false,
        skipHours: member.skipHours || false,
      });
    } else {
      setEditingMember(null);
      setFormData({
        email: '',
        displayName: '',
        roles: [UserRole.MEMBER],
        feesPaid: false,
        skipHours: false,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingMember(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingMember) {
        // Only update Firestore data for existing members
        await database.updateDocument<User>('users', editingMember.id, {
          displayName: formData.displayName,
          roles: formData.roles,
          feesPaid: formData.feesPaid,
          skipHours: formData.skipHours,
          updatedAt: new Date(),
        });
        reloadCurrentUser();
      } else {
        // Create new user in both Auth and Firestore
        const userId = await createUserAndSendInvite({
          email: formData.email,
          displayName: formData.displayName,
          roles: formData.roles,
        });

        // Update additional fields in Firestore
        await database.updateDocument<User>('users', userId, {
          feesPaid: formData.feesPaid,
        });

        // Show success message with email link
        enqueueSnackbar(
          'Mitglied wurde erstellt. Eine E-Mail mit Registrierungslink wurde versendet.',
          { variant: 'success' }
        );
      }
      handleClose();
      reload();
    } catch (error) {
      console.error('Error saving member:', error);
      enqueueSnackbar(
        'Fehler beim Speichern des Mitglieds: ' + (error as Error).message,
        { variant: 'error' }
      );
    }
  };

  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [memberToDeactivate, setMemberToDeactivate] = useState<User | null>(null);

  const handleDeactivateClick = (member: User) => {
    if (member.deactivated) {
      try {
        activateUser(member.id);
        reload();
        enqueueSnackbar('Mitglied wurde aktiviert.', { variant: 'success' });
      } catch (error) {
        console.error('Error activating user:', error);
        enqueueSnackbar(
          'Fehler beim Aktivieren des Mitglieds: ' + (error as Error).message,
          { variant: 'error' }
        );
      }
      return;
    }
    setMemberToDeactivate(member);
    setDeactivateDialogOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!memberToDeactivate) return;

    try {
      await deactivateUser(memberToDeactivate.id);
      // also delete all reservations of the member
      const reservations = await database.getDocuments<BoatReservation>('boatReservations', [{ field: 'userId', operator: 'eq', value: memberToDeactivate.id }]);
      await database.deleteDocuments('boatReservations', reservations.map(r => r.id));
      reload();
      enqueueSnackbar('Mitglied wurde deaktiviert.', { variant: 'success' });
    } catch (error) {
      console.error('Error deactivating member:', error);
      enqueueSnackbar(
        'Fehler beim Deaktivieren des Mitglieds: ' + (error as Error).message,
        { variant: 'error' }
      );
    } finally {
      setDeactivateDialogOpen(false);
      setMemberToDeactivate(null);
    }
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);

  const handleDeleteClick = (member: User) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;

    try {
      await deleteUser(memberToDelete.id);
      // delete all reservations of the member
      const reservations = await database.getDocuments<BoatReservation>('boatReservations', [{ field: 'userId', operator: 'eq', value: memberToDelete.id }]);
      await database.deleteDocuments('boatReservations', reservations.map(r => r.id));
      reload();
      enqueueSnackbar('Mitglied wurde gelöscht.', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting member:', error);
      enqueueSnackbar(
        'Fehler beim Löschen des Mitglieds: ' + (error as Error).message,
        { variant: 'error' }
      );
    } finally {
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPERADMIN:
        return 'Superadmin';
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.MEMBER:
        return 'Mitglied';
      case UserRole.APPLICANT:
        return 'Bewerber';
      default:
        return role;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPERADMIN:
        return 'error';
      case UserRole.ADMIN:
        return 'warning';
      case UserRole.MEMBER:
        return 'success';
      case UserRole.APPLICANT:
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading || !currentUser) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Mitglieder</Typography>
        {isSuperAdmin && systemConfig.featureFlags?.enableMemberCreation && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Mitglied hinzufügen
          </Button>
        )}
      </Box>

      <TableContainer sx={{ overflowX: 'auto', width: 'inherit' }}>
        <Table stickyHeader sx={{ tableLayout: 'fixed', width: { xs: 'inherit', md: '100%' } }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>Rolle</TableCell>
              <TableCell>Beitrag</TableCell>
              <TableCell>Arbeitsstunden</TableCell>
              {isSuperAdmin && <TableCell>Aktionen</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((member) => {
              const memberWorkHours = userWorkHours.find(({ user }) => user.id === member.id) || { completedDuration: 0, upcomingDuration: 0, declinedDuration: 0, appointments: { completed: [], upcoming: [], declined: [] } };
              return (
              <TableRow key={member.id}>
                <TableCell>{member.displayName}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  {
                    member.deactivated
                      ? (
                        <Chip label="Deaktiviert" sx={{ margin: 1 }} color="error" />
                      ) : member.roles.map((role) => (
                        <Chip label={getRoleLabel(role)} sx={{ margin: 1 }} variant="outlined" color={getRoleColor(role)} />
                      ))
                  }
                  {isAnyBootswart && (
                    <Chip label="Bootswart" sx={{ margin: 1 }} variant="outlined" color="primary" />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={member.feesPaid ? 'Bezahlt' : 'Ausstehend'}
                    color={member.feesPaid ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  {member.skipHours ? (
                    <Chip
                      label="ausgesetzt"
                      color="warning"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label={humanizer(memberWorkHours.completedDuration)}
                      color={memberWorkHours.completedDuration >= systemConfig.workHourThreshold * 3600000 ? 'success' : 'error'}
                    />
                  )}
                </TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    <IconButton onClick={() => handleOpen(member)} size="small">
                      <EditIcon color="primary" />
                    </IconButton>
                    {member.id !== currentUser?.id && (
                      <IconButton onClick={() => handleDeactivateClick(member)} size="small">
                        {member.deactivated ? <CheckCircleIcon color="success" /> : <BlockIcon color="error" />}
                      </IconButton>
                    )}
                    {member.id !== currentUser?.id && (
                      <IconButton onClick={() => handleDeleteClick(member)} size="small">
                        <DeleteIcon color="error" />
                      </IconButton>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {editingMember ? 'Mitglied bearbeiten' : 'Neues Mitglied hinzufügen'}
        </DialogTitle>
        <DialogContent>
          <TextField
            sx={{ wordWrap: 'break-word' }}
            label="E-Mail"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            fullWidth
            margin="normal"
            required
            disabled={!!editingMember}
          />
          <TextField
            label="Name"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            fullWidth
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Rollen</InputLabel>
            <Select
              multiple
              value={formData.roles}
              onChange={(e) => setFormData({ ...formData, roles: e.target.value as UserRole[] })}
              label="Rollen"
            >
              <MenuItem value={UserRole.MEMBER}>Mitglied</MenuItem>
              <MenuItem value={UserRole.ADMIN}>Admin</MenuItem>
              <MenuItem value={UserRole.SUPERADMIN}>Superadmin</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.feesPaid}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, feesPaid: e.target.checked })}
                />
              }
              label="Beitrag bezahlt"
              sx={{ mt: 2 }}
            />
            {formData.roles.includes(UserRole.MEMBER) && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.skipHours}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, skipHours: e.target.checked })}
                  />
                }
                label="Arbeitsstunden ausgesetzt"
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deactivateDialogOpen}
        onClose={() => setDeactivateDialogOpen(false)}
        aria-labelledby="deactivate-dialog-title"
      >
        <DialogTitle id="deactivate-dialog-title">
          Mitglied deaktivieren
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie dieses Mitglied deaktivieren möchten? Das Mitglied wird nicht gelöscht, aber verliert den Zugriff auf das System.
            Zusätzlich werden alle zugehörigen Reservierungen gelöscht.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialogOpen(false)} color="primary">
            Abbrechen
          </Button>
          <Button onClick={handleDeactivateConfirm} color="error" variant="contained" autoFocus>
            Deaktivieren
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Mitglied löschen
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie dieses Mitglied löschen möchten? Das Mitglied wird nicht mehr verfügbar und alle zugehörigen Daten werden gelöscht.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Abbrechen
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
