import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

jest.setTimeout(30000);
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

  it('allows member to create draft reservation with createdAt and updatedAt', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'boatReservations', 'r-ts'), {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('allows eligible owner to finalize draft to pending', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'boatReservations', 'r-draft'), {
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'boatReservations', 'r-draft'), {
      status: 'pending',
      updatedAt: new Date(),
    }));
  });

  it('denies ineligible owner from finalizing draft', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', 'member-nofee'), {
        email: 'nofee@example.com',
        displayName: 'Ohne Beitrag',
        roles: ['MEMBER'],
        feesPaid: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(db, 'boatReservations', 'r-nofee'), {
        boatId: 'boat-1',
        userId: 'member-nofee',
        userName: 'Ohne Beitrag',
        title: 'Tour',
        description: '',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T12:00:00Z'),
        status: 'draft',
        visibility: 'private',
        eligibilitySnapshot: { feesPaid: false, skipHours: false, workHoursMet: false },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-nofee').firestore();
    await assertFails(updateDoc(doc(db, 'boatReservations', 'r-nofee'), {
      status: 'pending',
      updatedAt: new Date(),
    }));
  });

  it('allows owner to cancel own draft reservation', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'boatReservations', 'r-cancel'), {
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'boatReservations', 'r-cancel'), {
      status: 'cancelled',
      updatedAt: new Date(),
    }));
  });

  it('denies owner from setting status=approved directly when boat requiresApproval', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'boatReservations', 'r-req-approval'), {
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(updateDoc(doc(db, 'boatReservations', 'r-req-approval'), {
      status: 'approved',
      updatedAt: new Date(),
    }));
  });

  it('allows owner to delete own draft reservation', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'boatReservations', 'r-del-draft'), {
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(deleteDoc(doc(db, 'boatReservations', 'r-del-draft')));
  });

  it('denies owner from deleting non-draft reservation', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'boatReservations', 'r-del-approved'), {
        boatId: 'boat-1',
        userId: 'member-1',
        userName: 'Mitglied',
        title: 'Tour',
        description: '',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T12:00:00Z'),
        status: 'approved',
        visibility: 'private',
        eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(deleteDoc(doc(db, 'boatReservations', 'r-del-approved')));
  });

  it('allows user to update onboardingState with updatedAt', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', 'member-1'), {
      onboardingState: 'completed',
      updatedAt: new Date(),
    }));
  });

  it('allows user to update own preferences with updatedAt', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', 'member-1'), {
      preferences: {
        calendarDefaults: {
          vormerkbuch: 'week',
          arbeitskalender: 'month',
        },
      },
      updatedAt: new Date(),
    }));
  });

  it('denies user from updating another user preferences', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(updateDoc(doc(db, 'users', 'admin-1'), {
      preferences: { calendarDefaults: { vormerkbuch: 'day' } },
      updatedAt: new Date(),
    }));
  });

  it('denies user from changing own roles via preferences update', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(updateDoc(doc(db, 'users', 'member-1'), {
      roles: ['SUPERADMIN'],
      preferences: {},
      updatedAt: new Date(),
    }));
  });

  it('allows member to create series copy as draft with own identity', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'boatReservations', 'r-series-1'), {
      boatId: 'boat-1',
      userId: 'member-1',
      userName: 'Mitglied',
      title: 'Wochentour',
      description: 'Kopie',
      startTime: new Date('2025-02-01T10:00:00Z'),
      endTime: new Date('2025-02-01T12:00:00Z'),
      status: 'draft',
      visibility: 'private',
      eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('denies member from creating series copy with another users identity', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(setDoc(doc(db, 'boatReservations', 'r-series-stolen'), {
      boatId: 'boat-1',
      userId: 'admin-1',
      userName: 'Admin',
      title: 'Wochentour',
      description: 'Kopie',
      startTime: new Date('2025-02-08T10:00:00Z'),
      endTime: new Date('2025-02-08T12:00:00Z'),
      status: 'draft',
      visibility: 'private',
      eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('denies series copy without eligibilitySnapshot', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(setDoc(doc(db, 'boatReservations', 'r-series-nosnap'), {
      boatId: 'boat-1',
      userId: 'member-1',
      userName: 'Mitglied',
      title: 'Wochentour',
      startTime: new Date('2025-02-15T10:00:00Z'),
      endTime: new Date('2025-02-15T12:00:00Z'),
      status: 'draft',
      visibility: 'private',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('allows admin to create work appointment', async () => {
    const db = testEnv.authenticatedContext('admin-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'workAppointments', 'wa-1'), {
      title: 'Bootsputzen',
      description: 'Herbstputz',
      boatId: 'boat-1',
      participants: [],
      supplies: [],
      startTime: new Date('2025-03-01T09:00:00Z'),
      endTime: new Date('2025-03-01T13:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('denies plain member from creating non-private work appointment', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(setDoc(doc(db, 'workAppointments', 'wa-denied'), {
      title: 'Putzen',
      description: '',
      participants: [],
      supplies: [],
      startTime: new Date('2025-03-01T09:00:00Z'),
      endTime: new Date('2025-03-01T13:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });
});
