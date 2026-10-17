import { SystemConfig, User } from '../types/models';

export type UiVersion = 'v1' | 'v2';

/** Admins/Superadmins dürfen v2 immer als Vorschau nutzen, Mitglieder erst nach Freigabe. */
export function canUseUiV2(config: SystemConfig, isAdmin: boolean): boolean {
  return isAdmin || config.featureFlags?.uiV2ForMembers === true;
}

/** Tatsächlich angezeigte Oberfläche: v2 nur, wenn gewählt und (noch) erlaubt. */
export function getEffectiveUiVersion(user: Pick<User, 'preferences'> | null | undefined, config: SystemConfig, isAdmin: boolean): UiVersion {
  return user?.preferences?.uiVersion === 'v2' && canUseUiV2(config, isAdmin) ? 'v2' : 'v1';
}
