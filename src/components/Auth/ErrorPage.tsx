import { Box, Paper, Typography, Button } from '@mui/material';
import { useApp } from '../../contexts/AppContext';

export const ErrorPage: React.FC = () => {
  const { signOut, currentUser } = useApp();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'grey.100',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          {currentUser?.deactivated ? 'Zugang deaktiviert' : 'Zugang in Bearbeitung'}
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          {currentUser?.deactivated ? 'Ihr Zugang wurde deaktiviert.' : 'Ihr Zugang wird derzeit geprüft. Bitte versuchen Sie es später erneut.'}
        </Typography>
        <Button
          color="primary"
          onClick={signOut}
          sx={{ textTransform: 'none' }}
        >
          Abmelden
        </Button>
      </Paper>
    </Box>
  );
};

export default ErrorPage;