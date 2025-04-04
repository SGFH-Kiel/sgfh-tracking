import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Divider,
} from '@mui/material';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Window';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, currentUser } = useApp();



  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signIn({ provider });
    } catch (err: any) {
      console.error('Google auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google Anmeldung wurde abgebrochen.');
      } else if (err.code === 'permission-denied') {
        setError('Keine Berechtigung zum Erstellen des Benutzerkontos.');
      } else {
        setError('Anmeldung mit Google fehlgeschlagen. Bitte versuchen Sie es erneut.');
      }
    }
    setLoading(false);
  };

  const handleMicrosoftAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signIn({ provider });
    } catch (err: any) {
      console.error('Microsoft auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Microsoft Anmeldung wurde abgebrochen.');
      } else if (err.code === 'permission-denied') {
        setError('Keine Berechtigung zum Erstellen des Benutzerkontos.');
      } else {
        setError('Anmeldung mit Microsoft fehlgeschlagen. Bitte versuchen Sie es erneut.');
      }
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn({ email, password });
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.');
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return <Navigate to="/" />;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'grey.100',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom align="center">
          SGFH Arbeitsstunden
        </Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label="E-Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Passwort"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ mt: 3 }}
          >
            Anmelden
          </Button>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              startIcon={<GoogleIcon />}
              variant="outlined"
              onClick={handleGoogleAuth}
              disabled={loading}
              fullWidth
            >
              Mit Google anmelden
            </Button>
            <Button
              startIcon={<MicrosoftIcon />}
              variant="outlined"
              onClick={handleMicrosoftAuth}
              disabled={loading}
              fullWidth
            >
              Mit Microsoft anmelden
            </Button>
          </Box>

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              oder
            </Typography>
          </Divider>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/signup">
              Noch kein Konto? Hier registrieren
            </Link>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};
