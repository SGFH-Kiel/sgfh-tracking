import React, { useState } from 'react';
import { TextField, Button, Box, Paper } from '@mui/material';
import { TimeEntry } from '../types';
import { useApp } from '../contexts/AppContext';

export const TimeEntryForm: React.FC = () => {
  const { database, currentUser } = useApp();
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');

  const handleStartTracking = async () => {
    if (!currentUser) return;

    const newEntry: Partial<TimeEntry> = {
      userId: currentUser.id,
      startTime: new Date(),
      description,
      project,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await database.addDocument('timeEntries', newEntry);
      setDescription('');
      setProject('');
    } catch (error) {
      console.error('Error adding time entry:', error);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box component="form" sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
        />
        <TextField
          label="Project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleStartTracking}
        >
          Start Tracking
        </Button>
      </Box>
    </Paper>
  );
};
