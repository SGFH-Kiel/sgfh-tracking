import React, { useState, useEffect, useCallback } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
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
  DialogActions,
  TextField,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ColorLens as ColorLensIcon,
} from '@mui/icons-material';
import { Boat, User } from '../../types/models';
import { useApp } from '../../contexts/AppContext';
import { getRandomBoatColor } from '../../utils/colors';

export const BoatList: React.FC = () => {
  const { isAdmin, database, currentUser, boats, reloadBoats } = useApp();
  const { setBreadcrumbs } = usePageTitle();
  const [open, setOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null);
  const isAnyBootswart = boats.some(boat => boat.bootswart === currentUser?.id);

  useEffect(() => {
    setBreadcrumbs([
      { text: 'Bootsverwaltung' },
    ]);
  }, [setBreadcrumbs]);
  const [formData, setFormData] = useState<Omit<Boat, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    bootswart: '',
    requiresApproval: true,
    blocked: false,
    color: getRandomBoatColor(),
  });
  const [users, setUsers] = useState<User[]>([]);


  const fetchUsers = useCallback(async () => {
    const userList = await database.getDocuments<User>('users');
    setUsers(userList);
  }, [database]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpen = (boat?: Boat) => {
    if (!isAdmin && (!isAnyBootswart || boat?.bootswart !== currentUser?.id)) {
      return;
    }
    if (boat) {
      setEditingBoat(boat);
      setFormData({
        name: boat.name,
        description: boat.description || '',
        bootswart: boat.bootswart || '',
        requiresApproval: boat.requiresApproval || false,
        blocked: boat.blocked || false,
        color: boat.color || getRandomBoatColor(),
      });
    } else {
      setEditingBoat(null);
      setFormData({
        name: '',
        description: '',
        bootswart: '',
        requiresApproval: true,
        blocked: false,
        color: getRandomBoatColor(),
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingBoat(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingBoat) {
        await database.updateDocument<Boat>('boats', editingBoat.id, {
          name: formData.name,
          description: formData.description,
          bootswart: formData.bootswart,
          requiresApproval: formData.requiresApproval || false,
          blocked: formData.blocked || false,
          color: formData.color,
          updatedAt: new Date(),
        });
      } else {
        await database.addDocument('boats', {
          name: formData.name,
          description: formData.description,
          bootswart: formData.bootswart,
          requiresApproval: formData.requiresApproval || false,
          blocked: formData.blocked || false,
          color: formData.color,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      handleClose();
      reloadBoats();
    } catch (error) {
      console.error('Error saving boat:', error);
    }
  };

  const handleDelete = async (boatId: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Boot löschen möchten?')) {
      try {
        await database.deleteDocument('boats', boatId);
        reloadBoats();
      } catch (error) {
        console.error('Error deleting boat:', error);
      }
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Boote</Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Boot hinzufügen
          </Button>
        )}
      </Box>

      <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
        <Table stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow>
              <TableCell width="20%">Boot</TableCell>
              <TableCell width="30%">Beschreibung</TableCell>
              <TableCell width="15%">Bootswart</TableCell>
              <TableCell width="15%">Genehmigung</TableCell>
              <TableCell width="10%">Status</TableCell>
              {(isAdmin || isAnyBootswart) && <TableCell width="10%">Aktionen</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {boats.map((boat) => (
              <TableRow key={boat.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: boat.color || '#ccc',
                      }}
                    />
                    {boat.name}
                  </Box>
                </TableCell>
                <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{boat.description}</TableCell>
                <TableCell>{boat.bootswart ? users.find(u => u.id === boat.bootswart)?.displayName : '-'}</TableCell>
                <TableCell>
                  {boat.requiresApproval ? 'Erforderlich' : 'Nicht erforderlich'}
                </TableCell>
                <TableCell>
                  {boat.blocked ? (
                    <Chip color="error" label="Gesperrt" size="small" />
                  ) : (
                    <Chip color="success" label="Freigegeben" size="small" />
                  )}
                </TableCell>
                {(isAdmin || (isAnyBootswart && boat.bootswart === currentUser?.id)) && (
                  <TableCell>
                    <IconButton onClick={() => handleOpen(boat)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(boat.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {editingBoat ? 'Boot bearbeiten' : 'Neues Boot hinzufügen'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Beschreibung"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />

          <Box sx={{ mt: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Farbe"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              sx={{ flex: 1 }}
              placeholder="CSS Farbwert (z.B. #FF0000)"
              InputProps={{
                startAdornment: (
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: formData.color,
                      mr: 1,
                      border: '1px solid rgba(0, 0, 0, 0.23)',
                    }}
                  />
                ),
              }}
            />
            <Tooltip title="Zufällige Farbe">
              <IconButton
                onClick={() => setFormData({ ...formData, color: getRandomBoatColor() })}
                color="primary"
              >
                <ColorLensIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <FormControl fullWidth margin="normal">
            <InputLabel>Bootswart</InputLabel>
            <Select
              label="Bootswart"
              value={formData.bootswart}
              onChange={(e) => setFormData({ ...formData, bootswart: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="">n/a</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 1, flexDirection: 'column', display: 'flex' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requiresApproval}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                />
              }
              label="Reservierungen benötigen Genehmigung"
              sx={{ mt: 2 }}
            />
            {(isAdmin || (isAnyBootswart && editingBoat?.bootswart === currentUser?.id)) && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.blocked}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, blocked: e.target.checked })}
                  />
                }
                label="Boot gesperrt"
                sx={{ mt: 1 }}
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
    </Paper>
  );
};
