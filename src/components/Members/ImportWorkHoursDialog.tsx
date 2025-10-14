import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  LinearProgress,
} from '@mui/material';
import { read, utils } from 'xlsx';
import { WorkParticipant, User } from '../../types/models';
import { useApp } from '../../contexts/AppContext';

interface ImportWorkHoursDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportedParticipant {
  userIdentifier: string; // Can be email or username
  startTime: Date;
  endTime: Date;
}

export const ImportWorkHoursDialog: React.FC<ImportWorkHoursDialogProps> = ({
  open,
  onClose,
  onImportComplete
}) => {
  const { database, boats } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBoat, setSelectedBoat] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportedParticipant[]>([]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedBoat('');
    setFile(null);
    setError(null);
    setPreview([]);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFile(file);
    setError(null);
    try {
      const data = await parseFile(file);
      setPreview(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error parsing file');
      setFile(null);
    }
  };

  const parseFile = async (file: File): Promise<ImportedParticipant[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = utils.sheet_to_json<any>(firstSheet);

          if (rows.length === 0) {
            throw new Error('Die Datei ist leer');
          }

          // Validate headers
          const requiredColumns = ['userIdentifier', 'startTime', 'endTime'];
          const headers = Object.keys(rows[0]);
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));
          
          if (missingColumns.length > 0) {
            throw new Error(`Fehlende Pflichtfelder: ${missingColumns.join(', ')}`);
          }

          const participants = rows.map((row: any) => ({
            userIdentifier: row.userIdentifier,
            startTime: new Date(row.startTime),
            endTime: new Date(row.endTime),
          }));

          // Validate data
          participants.forEach((p, index) => {
            if (isNaN(p.startTime.getTime())) {
              throw new Error(`Ungültige Startzeit in Zeile ${index + 1}`);
            }
            if (isNaN(p.endTime.getTime())) {
              throw new Error(`Ungültige Endzeit in Zeile ${index + 1}`);
            }
          });

          resolve(participants);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!title || !preview.length) {
      setError('Please fill in all required fields and upload a valid file');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      // Map userIdentifiers to actual user IDs
      const participants: WorkParticipant[] = await Promise.all(
        preview.map(async (p) => {
          // Try to find user by email or username
          const users = await database.getDocuments<User>('users');
          const user = users.find(
            (u) => u.email === p.userIdentifier || u.displayName === p.userIdentifier
          );

          if (!user) {
            throw new Error(`User not found: ${p.userIdentifier}`);
          }

          return {
            userId: user.id,
            userName: user.displayName,
            status: 'confirmed',
            startTime: new Date(p.startTime),
            endTime: new Date(p.endTime),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        })
      );

      // Create work appointment
      await database.addDocument('workAppointments', {
        title,
        description,
        boatId: selectedBoat || undefined,
        startTime: new Date(Math.min(...participants.map(p => p.startTime!.getTime()))),
        endTime: new Date(Math.max(...participants.map(p => p.endTime!.getTime()))),
        participants,
        supplies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      onImportComplete();
      onClose();
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Importieren der Daten');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Arbeitsstunden importieren</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
          
          <TextField
            label="Beschreibung"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Boot (Optional)</InputLabel>
            <Select
              value={selectedBoat}
              onChange={(e) => setSelectedBoat(e.target.value)}
              label="Boot (Optional)"
            >
              <MenuItem value="">
                <em>Keins</em>
              </MenuItem>
              {boats.map((boat) => (
                <MenuItem key={boat.id} value={boat.id}>
                  {boat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <input
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload">
              <Button variant="contained" component="span">
                Datei hochladen
              </Button>
            </label>
            {file && (
              <Typography variant="body2" sx={{ ml: 2, display: 'inline' }}>
                {file.name}
              </Typography>
            )}
          </Box>

          {preview.length > 0 && (
            <Box>
              <Typography variant="subtitle1">Vorschau:</Typography>
              <Typography variant="body2">
                {preview.length} Teilnehmer gefunden
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {importing && <LinearProgress />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!file || importing}
        >
          Importieren
        </Button>
      </DialogActions>
    </Dialog>
  );
};
