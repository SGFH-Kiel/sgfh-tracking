import { useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { CHANGELOG } from '../changelog';
import { ChangelogEntry, getUnseenChangelog, getVisibleChangelog, mergeSeenChangelogIds } from '../domain/changelog';
import { isSeasonModelActive } from '../domain/seasons';
import { User } from '../types/models';

export const useChangelog = (): { visible: ChangelogEntry[]; unseen: ChangelogEntry[]; markAllSeen: () => Promise<void> } => {
  const { currentUser, isAdmin, isSuperAdmin, isAnyBootswart, systemConfig, database, reloadCurrentUser } = useApp();
  const seasonModelActive = isSeasonModelActive(systemConfig);
  const uiV2Released = systemConfig.featureFlags?.uiV2ForMembers === true;

  const visible = useMemo(
    () => getVisibleChangelog(CHANGELOG, { isAdmin, isSuperAdmin, isBootswart: isAnyBootswart, seasonModelActive, uiV2Released }),
    [isAdmin, isSuperAdmin, isAnyBootswart, seasonModelActive, uiV2Released],
  );
  const seenIds = currentUser?.preferences?.seenChangelogIds;
  const unseen = useMemo(() => getUnseenChangelog(visible, seenIds), [visible, seenIds]);

  const markAllSeen = useCallback(async () => {
    if (!currentUser || unseen.length === 0) return;
    try {
      await database.updateDocument<User>('users', currentUser.id, {
        preferences: {
          ...(currentUser.preferences ?? {}),
          seenChangelogIds: mergeSeenChangelogIds(visible, currentUser.preferences?.seenChangelogIds),
        },
        updatedAt: new Date(),
      });
      await reloadCurrentUser();
    } catch (error) {
      console.error('Error marking changelog as seen:', error);
    }
  }, [currentUser, unseen.length, visible, database, reloadCurrentUser]);

  return { visible, unseen, markAllSeen };
};
