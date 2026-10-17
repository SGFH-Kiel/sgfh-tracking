import { useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { canUseUiV2, getEffectiveUiVersion, UiVersion } from '../domain/uiVersion';
import { User } from '../types/models';

export const useUiVersion = (): { version: UiVersion; canUseV2: boolean; setVersion: (version: UiVersion) => Promise<void> } => {
  const { currentUser, systemConfig, isAdmin, database, reloadCurrentUser } = useApp();
  const canUseV2 = canUseUiV2(systemConfig, isAdmin);
  const version = getEffectiveUiVersion(currentUser, systemConfig, isAdmin);

  const setVersion = useCallback(async (next: UiVersion) => {
    if (!currentUser) return;
    await database.updateDocument<User>('users', currentUser.id, {
      preferences: { ...(currentUser.preferences ?? {}), uiVersion: next },
      updatedAt: new Date(),
    });
    await reloadCurrentUser();
  }, [currentUser, database, reloadCurrentUser]);

  return { version, canUseV2, setVersion };
};
