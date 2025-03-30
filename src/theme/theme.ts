import { createTheme } from '@mui/material/styles';

// Maritime color palette
const palette = {
  primary: {
    main: '#1B4965', // Deep sea blue
    light: '#62B6CB', // Light ocean blue
    dark: '#0C2233', // Dark navy
    contrastText: '#fff',
  },
  secondary: {
    main: '#5FA8D3', // Sky blue
    light: '#CAE9FF', // Light sky
    dark: '#1B4965', // Deep blue
    contrastText: '#fff',
  },
  background: {
    default: '#F7F9FB', // Off-white with blue tint
    paper: '#FFFFFF',
  },
  error: {
    main: '#D64045', // Coral red
    light: '#FF6B6B',
    dark: '#A63D41',
  },
  warning: {
    main: '#FFB563', // Sandy orange
    light: '#FFD29D',
    dark: '#CC8F4D',
  },
  success: {
    main: '#2A9D8F', // Seafoam green
    light: '#40C9B5',
    dark: '#1F7268',
  },
  info: {
    main: '#5FA8D3', // Ocean blue
    light: '#88C1E3',
    dark: '#4B86A9',
  },
};

export const theme = createTheme({
  palette,
  typography: {
    fontFamily: "'Roboto', 'Arial', sans-serif",
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      color: palette.primary.dark,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      color: palette.primary.dark,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      color: palette.primary.dark,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      color: palette.primary.dark,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: palette.primary.dark,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      color: palette.primary.dark,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${palette.primary.light}20`,
        },
        head: {
          fontWeight: 600,
          backgroundColor: `${palette.primary.light}10`,
        },
      },
    },
  },
});
