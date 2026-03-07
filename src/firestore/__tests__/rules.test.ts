import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, setDoc, getDoc } from 'firebase/firestore';

describe('firestore rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'sgfh-tracking-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', 'member-1'), {
        email: 'member@example.com',
        displayName: 'Mitglied',
        roles: ['MEMBER'],
        feesPaid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(db, 'users', 'admin-1'), {
        email: 'admin@example.com',
        displayName: 'Admin',
        roles: ['ADMIN'],
        feesPaid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(db, 'boats', 'boat-1'), {
        name: 'Laser',
        bootswart: 'admin-1',
        requiresApproval: true,
        blocked: false,
        color: '#123456',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  });

  it('denies anonymous write to reservations', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'boatReservations', 'r1'), {
      boatId: 'boat-1',
      userId: 'member-1',
      userName: 'Mitglied',
      title: 'Tour',
      startTime: new Date('2025-01-01T10:00:00Z'),
      endTime: new Date('2025-01-01T12:00:00Z'),
      status: 'draft',
      visibility: 'private',
      eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
    }));
  });

  it('allows members to create draft reservations', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'boatReservations', 'r1'), {
      boatId: 'boat-1',
      userId: 'member-1',
      userName: 'Mitglied',
      title: 'Tour',
      description: '',
      startTime: new Date('2025-01-01T10:00:00Z'),
      endTime: new Date('2025-01-01T12:00:00Z'),
      status: 'draft',
      visibility: 'private',
      eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
    }));
  });

  it('denies reservation creation with manipulated userId', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(setDoc(doc(db, 'boatReservations', 'r2'), {
      boatId: 'boat-1',
      userId: 'admin-1',
      userName: 'Admin',
      title: 'Tour',
      description: '',
      startTime: new Date('2025-01-01T10:00:00Z'),
      endTime: new Date('2025-01-01T12:00:00Z'),
      status: 'draft',
      visibility: 'private',
      eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
    }));
  });

  it('allows anonymous read on public reservation feed', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'publicBoatReservations', 'pub-1'), {
        boatId: 'boat-1',
        boatName: 'Laser',
        title: 'Mitsegeln',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T12:00:00Z'),
        visibility: 'public',
        reservationStatus: 'approved',
        updatedAt: new Date(),
      });
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'publicBoatReservations', 'pub-1')));
  });

  it('denies anonymous write on public reservation feed', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'publicBoatReservations', 'pub-2'), {
      boatId: 'boat-1',
      boatName: 'Laser',
      title: 'Mitsegeln',
      startTime: new Date('2025-01-01T10:00:00Z'),
      endTime: new Date('2025-01-01T12:00:00Z'),
      visibility: 'public',
      reservationStatus: 'approved',
      updatedAt: new Date(),
    }));
  });
});
