import { canUseUiV2, getEffectiveUiVersion } from '../uiVersion';
import { SystemConfig } from '../../types/models';

const config: SystemConfig = { id: 'default', yearChangeDate: new Date(2000, 9, 1), workHourThreshold: 8 };
const released: SystemConfig = { ...config, featureFlags: { uiV2ForMembers: true } };

describe('uiVersion', () => {
  it('lets admins always preview v2 and members only after release', () => {
    expect(canUseUiV2(config, true)).toBe(true);
    expect(canUseUiV2(config, false)).toBe(false);
    expect(canUseUiV2(released, false)).toBe(true);
  });

  it('defaults to v1 and falls back when the release is withdrawn', () => {
    expect(getEffectiveUiVersion({ preferences: {} }, released, false)).toBe('v1');
    expect(getEffectiveUiVersion({ preferences: { uiVersion: 'v2' } }, released, false)).toBe('v2');
    expect(getEffectiveUiVersion({ preferences: { uiVersion: 'v2' } }, config, false)).toBe('v1');
    expect(getEffectiveUiVersion({ preferences: { uiVersion: 'v2' } }, config, true)).toBe('v2');
    expect(getEffectiveUiVersion(null, released, true)).toBe('v1');
  });
});
