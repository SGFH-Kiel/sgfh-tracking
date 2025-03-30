import { createTheme } from '@mui/material/styles';
import { deDE } from '@mui/material/locale';

export const theme = createTheme(
  {
    palette: {
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
    components: {
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          fullWidth: true,
        },
      },
    },
  },
  deDE // German localization
);
