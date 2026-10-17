import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Rot hervorgehobene Bestätigung für destruktive Aktionen (Löschen). */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

/** Einheitliche Rückfrage vor folgenreichen Aktionen (statt `window.confirm`). */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => new Promise<boolean>((resolve) => {
    resolverRef.current = resolve;
    setOptions(next);
  }), []);

  const close = (result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!options} onClose={() => close(false)} maxWidth="xs" fullWidth>
        {options && (
          <>
            <DialogTitle>{options.title}</DialogTitle>
            {options.message && (
              <DialogContent>
                <DialogContentText component="div">{options.message}</DialogContentText>
              </DialogContent>
            )}
            <DialogActions>
              <Button onClick={() => close(false)}>{options.cancelLabel ?? 'Abbrechen'}</Button>
              <Button
                onClick={() => close(true)}
                variant="contained"
                color={options.destructive ? 'error' : 'primary'}
                autoFocus
              >
                {options.confirmLabel ?? 'Bestätigen'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => useContext(ConfirmContext);
