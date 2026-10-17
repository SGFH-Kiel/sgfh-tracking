import { CHANGELOG } from '../../changelog';
import {
  ChangelogEntry,
  canSeeAudience,
  getUnseenChangelog,
  getVisibleChangelog,
  mergeSeenChangelogIds,
} from '../changelog';

const member = { isSuperAdmin: false, isAdmin: false, isBootswart: false, seasonModelActive: false };
const bootswart = { ...member, isBootswart: true };
const admin = { ...member, isAdmin: true };
const superadmin = { ...member, isAdmin: true, isSuperAdmin: true };

const entries: ChangelogEntry[] = [
  {
    id: 'b',
    date: '2026-10-18',
    title: 'Nur Admins',
    type: 'improvement',
    sections: [{ audience: 'admin', items: ['x'] }],
  },
  {
    id: 'a',
    date: '2026-10-17',
    title: 'Gemischt',
    type: 'feature',
    sections: [
      { audience: 'all', items: ['alle'] },
      { audience: 'all', items: ['aktiv'], onlyWhen: 'seasonModelActive' },
      { audience: 'superadmin', items: ['vorher'], onlyWhen: 'seasonModelInactive' },
    ],
  },
];

describe('changelog', () => {
  it('lets higher roles see the sections of lower roles', () => {
    expect(canSeeAudience('bootswart', bootswart)).toBe(true);
    expect(canSeeAudience('bootswart', admin)).toBe(true);
    expect(canSeeAudience('admin', bootswart)).toBe(false);
    expect(canSeeAudience('superadmin', admin)).toBe(false);
    expect(canSeeAudience('superadmin', superadmin)).toBe(true);
  });

  it('hides entries without visible sections and filters by condition', () => {
    expect(getVisibleChangelog(entries, member).map((e) => e.id)).toEqual(['a']);
    expect(getVisibleChangelog(entries, member)[0].sections.map((s) => s.items[0])).toEqual(['alle']);
    expect(getVisibleChangelog(entries, { ...superadmin })[1].sections.map((s) => s.items[0])).toEqual(['alle', 'vorher']);
    expect(getVisibleChangelog(entries, { ...member, seasonModelActive: true })[0].sections.map((s) => s.items[0])).toEqual(['alle', 'aktiv']);
  });

  it('tracks seen entries by id so later visible entries still count as new', () => {
    const visibleForMember = getVisibleChangelog(entries, member);
    const seen = mergeSeenChangelogIds(visibleForMember, undefined);
    expect(seen).toEqual(['a']);
    const visibleForAdmin = getVisibleChangelog(entries, admin);
    expect(getUnseenChangelog(visibleForAdmin, seen).map((e) => e.id)).toEqual(['b']);
    expect(mergeSeenChangelogIds(visibleForAdmin, seen)).toEqual(['a', 'b']);
  });

  it('keeps the shipped changelog consistent', () => {
    const ids = CHANGELOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    CHANGELOG.forEach((entry) => {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.sections.length).toBeGreaterThan(0);
      entry.sections.forEach((section) => expect(section.items.length).toBeGreaterThan(0));
    });
    const dates = CHANGELOG.map((entry) => entry.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
