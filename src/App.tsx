import React from 'react';
import { CssBaseline, ThemeProvider, CircularProgress, Box } from '@mui/material';
import { theme } from './theme/theme';
import { AppProvider, useApp } from './contexts/AppContext';
import { PageTitleProvider } from './contexts/PageTitleContext';
import { Layout } from './components/Layout';
import { Login } from './components/Auth/Login';
import { Signup } from './components/Auth/Signup';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { SnackbarProvider } from 'notistack';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ErrorPage } from './components/Auth/ErrorPage';

import 'dayjs/locale/de';

const AppContent = () => {
  const { loading } = useApp();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/denied" element={<ErrorPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <SnackbarProvider maxSnack={3} autoHideDuration={4000}>
          <AppProvider>
            <PageTitleProvider>
              <ThemeProvider theme={theme}>
                <CssBaseline />
                <AppContent />
              </ThemeProvider>
            </PageTitleProvider>
          </AppProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </BrowserRouter>
  );
}

export default App;
