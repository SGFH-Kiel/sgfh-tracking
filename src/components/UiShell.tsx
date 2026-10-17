import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Layout } from './Layout';
import { useUiVersion } from '../hooks/useUiVersion';

// v2 wird nur geladen, wenn sie aktiv ist – die klassische Ansicht bleibt dadurch unverändert schlank.
const V2Shell = React.lazy(() => import('../v2/V2Shell').then((module) => ({ default: module.V2Shell })));

/** Wählt je Nutzer die klassische Oberfläche (v1) oder die neue Oberfläche (v2). */
export const UiShell: React.FC = () => {
  const { version } = useUiVersion();
  if (version === 'v2') {
    return (
      <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>}>
        <V2Shell />
      </Suspense>
    );
  }
  return <Layout />;
};
