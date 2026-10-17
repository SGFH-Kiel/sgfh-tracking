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
      await setDoc(doc(db, 'users', 'superadmin-1'), {
        email: 'super@example.com',
        displayName: 'Superadmin',
        roles: ['SUPERADMIN'],
        feesPaid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(db, 'users', 'other-1'), {
        email: 'other@example.com',
        displayName: 'Andere',
        roles: ['MEMBER'],
        feesPaid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(db, 'users', 'bootswart2-1'), {
        email: 'bootswart2@example.com',
        displayName: 'Zweiter Bootswart',
        roles: ['MEMBER'],
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
      await setDoc(doc(db, 'boats', 'boat-2'), {
        name: 'Optimist',
        bootswart: 'admin-1',
        bootswart2: 'bootswart2-1',
        requiresApproval: true,
        blocked: false,
        color: '#654321',
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

  // --- bootswart2 tests ---

  it('allows bootswart2 to update their boat', async () => {
    const db = testEnv.authenticatedContext('bootswart2-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'boats', 'boat-2'), {
      description: 'Geänderte Beschreibung',
      updatedAt: new Date(),
    }));
  });

  it('denies bootswart2 from updating a boat they are not assigned to', async () => {
    const db = testEnv.authenticatedContext('bootswart2-1').firestore();
    await assertFails(updateDoc(doc(db, 'boats', 'boat-1'), {
      description: 'Darf nicht',
      updatedAt: new Date(),
    }));
  });

  it('allows bootswart2 to approve a pending reservation for their boat', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'boatReservations', 'r-bw2-pending'), {
        boatId: 'boat-2',
        userId: 'member-1',
        userName: 'Mitglied',
        title: 'Tour',
        description: '',
        startTime: new Date('2025-04-01T10:00:00Z'),
        endTime: new Date('2025-04-01T12:00:00Z'),
        status: 'pending',
        visibility: 'private',
        eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('bootswart2-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'boatReservations', 'r-bw2-pending'), {
      status: 'approved',
      updatedAt: new Date(),
    }));
  });

  it('denies bootswart2 from approving a reservation for a boat they are not assigned to', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'boatReservations', 'r-bw2-other'), {
        boatId: 'boat-1',
        userId: 'member-1',
        userName: 'Mitglied',
        title: 'Tour',
        description: '',
        startTime: new Date('2025-04-02T10:00:00Z'),
        endTime: new Date('2025-04-02T12:00:00Z'),
        status: 'pending',
        visibility: 'private',
        eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('bootswart2-1').firestore();
    await assertFails(updateDoc(doc(db, 'boatReservations', 'r-bw2-other'), {
      status: 'approved',
      updatedAt: new Date(),
    }));
  });

  it('allows bootswart2 to create a work appointment for their boat', async () => {
    const db = testEnv.authenticatedContext('bootswart2-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'workAppointments', 'wa-bw2'), {
      title: 'Bootsputzen',
      description: 'Herbstputz',
      boatId: 'boat-2',
      participants: [],
      supplies: [],
      startTime: new Date('2025-05-01T09:00:00Z'),
      endTime: new Date('2025-05-01T13:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('denies bootswart2 from creating a work appointment for a boat they are not assigned to', async () => {
    const db = testEnv.authenticatedContext('bootswart2-1').firestore();
    await assertFails(setDoc(doc(db, 'workAppointments', 'wa-bw2-denied'), {
      title: 'Putzen fremdes Boot',
      description: '',
      boatId: 'boat-1',
      participants: [],
      supplies: [],
      startTime: new Date('2025-05-02T09:00:00Z'),
      endTime: new Date('2025-05-02T13:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('allows bootswart2 to update a work appointment for their boat', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'workAppointments', 'wa-bw2-update'), {
        title: 'Arbeit',
        description: '',
        boatId: 'boat-2',
        participants: [],
        supplies: [],
        startTime: new Date('2025-05-03T09:00:00Z'),
        endTime: new Date('2025-05-03T13:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('bootswart2-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'workAppointments', 'wa-bw2-update'), {
      description: 'Aktualisiert',
      updatedAt: new Date(),
    }));
  });

  it('allows bootswart2 to delete a work appointment for their boat', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'workAppointments', 'wa-bw2-delete'), {
        title: 'Zu löschen',
        description: '',
        boatId: 'boat-2',
        participants: [],
        supplies: [],
        startTime: new Date('2025-05-04T09:00:00Z'),
        endTime: new Date('2025-05-04T13:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('bootswart2-1').firestore();
    await assertSucceeds(deleteDoc(doc(db, 'workAppointments', 'wa-bw2-delete')));
  });

  // --- private work hours self-confirmation tests ---

  it('allows member to create a private work appointment for themselves', async () => {
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(setDoc(doc(db, 'workAppointments', 'wa-private-1'), {
      title: 'Private Arbeit',
      description: 'Selbst erledigt',
      private: true,
      createdByUserId: 'member-1',
      createdByUserName: 'Mitglied',
      participants: [{
        userId: 'member-1',
        userName: 'Mitglied',
        status: 'pending',
        startTime: new Date('2025-06-01T09:00:00Z'),
        endTime: new Date('2025-06-01T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      supplies: [],
      startTime: new Date('2025-06-01T09:00:00Z'),
      endTime: new Date('2025-06-01T11:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('denies member from self-confirming their own private work appointment via updateDoc', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'workAppointments', 'wa-private-selfconfirm'), {
        title: 'Private Arbeit',
        description: '',
        private: true,
        createdByUserId: 'member-1',
        createdByUserName: 'Mitglied',
        participants: [{
          userId: 'member-1',
          userName: 'Mitglied',
          status: 'pending',
          startTime: new Date('2025-06-02T09:00:00Z'),
          endTime: new Date('2025-06-02T11:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        supplies: [],
        startTime: new Date('2025-06-02T09:00:00Z'),
        endTime: new Date('2025-06-02T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-private-selfconfirm'), {
      participants: [{
        userId: 'member-1',
        userName: 'Mitglied',
        status: 'confirmed',
        startTime: new Date('2025-06-02T09:00:00Z'),
        endTime: new Date('2025-06-02T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      updatedAt: new Date(),
    }));
  });

  it('allows member to edit their own unconfirmed private appointment without changing status', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'workAppointments', 'wa-private-edit'), {
        title: 'Private Arbeit',
        description: '',
        private: true,
        createdByUserId: 'member-1',
        createdByUserName: 'Mitglied',
        participants: [{
          userId: 'member-1',
          userName: 'Mitglied',
          status: 'pending',
          startTime: new Date('2025-06-03T09:00:00Z'),
          endTime: new Date('2025-06-03T11:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        supplies: [],
        startTime: new Date('2025-06-03T09:00:00Z'),
        endTime: new Date('2025-06-03T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'workAppointments', 'wa-private-edit'), {
      title: 'Geändert',
      description: 'Neue Beschreibung',
      startTime: new Date('2025-06-03T10:00:00Z'),
      endTime: new Date('2025-06-03T12:00:00Z'),
      participants: [{
        userId: 'member-1',
        userName: 'Mitglied',
        status: 'pending',
        startTime: new Date('2025-06-03T10:00:00Z'),
        endTime: new Date('2025-06-03T12:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      updatedAt: new Date(),
    }));
  });

  it('denies member from editing a private appointment that is already confirmed', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'workAppointments', 'wa-private-locked'), {
        title: 'Bestätigte Arbeit',
        description: '',
        private: true,
        createdByUserId: 'member-1',
        createdByUserName: 'Mitglied',
        participants: [{
          userId: 'member-1',
          userName: 'Mitglied',
          status: 'confirmed',
          startTime: new Date('2025-06-04T09:00:00Z'),
          endTime: new Date('2025-06-04T11:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        supplies: [],
        startTime: new Date('2025-06-04T09:00:00Z'),
        endTime: new Date('2025-06-04T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-private-locked'), {
      title: 'Geändert obwohl bestätigt',
      participants: [{
        userId: 'member-1',
        userName: 'Mitglied',
        status: 'confirmed',
        startTime: new Date('2025-06-04T09:00:00Z'),
        endTime: new Date('2025-06-04T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      updatedAt: new Date(),
    }));
  });

  it('allows admin to confirm a member on a private work appointment', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'workAppointments', 'wa-private-adminconfirm'), {
        title: 'Private Arbeit',
        description: '',
        private: true,
        createdByUserId: 'member-1',
        createdByUserName: 'Mitglied',
        participants: [{
          userId: 'member-1',
          userName: 'Mitglied',
          status: 'pending',
          startTime: new Date('2025-06-05T09:00:00Z'),
          endTime: new Date('2025-06-05T11:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        supplies: [],
        startTime: new Date('2025-06-05T09:00:00Z'),
        endTime: new Date('2025-06-05T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('admin-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'workAppointments', 'wa-private-adminconfirm'), {
      participants: [{
        userId: 'member-1',
        userName: 'Mitglied',
        status: 'confirmed',
        startTime: new Date('2025-06-05T09:00:00Z'),
        endTime: new Date('2025-06-05T11:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      updatedAt: new Date(),
    }));
  });

  it('allows member to join a public work appointment (add self as pending)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'workAppointments', 'wa-public-join'), {
        title: 'Öffentliche Arbeit',
        description: '',
        boatId: 'boat-1',
        participants: [],
        supplies: [],
        startTime: new Date('2025-06-06T09:00:00Z'),
        endTime: new Date('2025-06-06T13:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertSucceeds(updateDoc(doc(db, 'workAppointments', 'wa-public-join'), {
      participants: [{
        userId: 'member-1',
        userName: 'Mitglied',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
    }));
  });

  it('denies member from self-confirming on a public work appointment via updateDoc', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'workAppointments', 'wa-public-selfconfirm'), {
        title: 'Öffentliche Arbeit',
        description: '',
        boatId: 'boat-1',
        participants: [{
          userId: 'member-1',
          userName: 'Mitglied',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        supplies: [],
        startTime: new Date('2025-06-07T09:00:00Z'),
        endTime: new Date('2025-06-07T13:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext('member-1').firestore();
    await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-public-selfconfirm'), {
      participants: [{
        userId: 'member-1',
        userName: 'Mitglied',
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
    }));
  });

  // ---------------------------------------------------------------------------
  // Saisonmodell & Härtung (Audit 2026-10)
  // ---------------------------------------------------------------------------

  const seed = async (path: string, id: string, data: Record<string, unknown>) => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), path, id), data);
    });
  };

  const seasonConfig = (overrides: Record<string, unknown> = {}) => ({
    yearChangeDate: new Date(2000, 9, 1),
    workHourThreshold: 8,
    currentSeason: 2026,
    nextSeasonOpen: true,
    seasonBackfillAt: new Date('2026-10-16T10:00:00Z'),
    seasonModelActivatedAt: new Date('2026-10-17T10:00:00Z'),
    ...overrides,
  });

  const participant = (overrides: Record<string, unknown> = {}) => ({
    userId: 'member-1',
    userName: 'Mitglied',
    status: 'pending',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  });

  const privateAppointment = (participantOverrides: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}) => ({
    title: 'Private Arbeit',
    description: '',
    private: true,
    createdByUserId: 'member-1',
    createdByUserName: 'Mitglied',
    participants: [participant({
      startTime: new Date('2026-10-10T09:00:00Z'),
      endTime: new Date('2026-10-10T11:00:00Z'),
      ...participantOverrides,
    })],
    supplies: [],
    startTime: new Date('2026-10-10T09:00:00Z'),
    endTime: new Date('2026-10-10T11:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const publicAppointment = (participants: Record<string, unknown>[], overrides: Record<string, unknown> = {}) => ({
    title: 'Öffentliche Arbeit',
    description: '',
    boatId: 'boat-1',
    participants,
    supplies: [],
    startTime: new Date('2026-10-12T09:00:00Z'),
    endTime: new Date('2026-10-12T13:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const other = participant({ userId: 'other-1', userName: 'Andere', status: 'confirmed' });

  describe('season model', () => {
    it('denies season fields on private entries while the season model is inactive', async () => {
      await seed('systemConfig', 'default', seasonConfig({ seasonModelActivatedAt: null, currentSeason: null }));
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-s1'), privateAppointment({ season: 2027 })));
      await assertSucceeds(setDoc(doc(db, 'workAppointments', 'wa-s1b'), privateAppointment()));
    });

    it('keeps backfilled season values editable before activation when unchanged', async () => {
      await seed('systemConfig', 'default', seasonConfig({ seasonModelActivatedAt: null }));
      await seed('workAppointments', 'wa-s2', privateAppointment({ season: 2027 }));
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertSucceeds(updateDoc(doc(db, 'workAppointments', 'wa-s2'), {
        title: 'Geändert',
        participants: [participant({ season: 2027, startTime: new Date('2026-10-10T10:00:00Z'), endTime: new Date('2026-10-10T12:00:00Z') })],
      }));
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-s2'), {
        participants: [participant({ season: 2026, startTime: new Date('2026-10-10T10:00:00Z'), endTime: new Date('2026-10-10T12:00:00Z') })],
      }));
    });

    it('allows booking current or open next season and rejects others once active', async () => {
      await seed('systemConfig', 'default', seasonConfig());
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertSucceeds(setDoc(doc(db, 'workAppointments', 'wa-s3a'), privateAppointment({ season: 2026 })));
      await assertSucceeds(setDoc(doc(db, 'workAppointments', 'wa-s3b'), privateAppointment({ season: 2027, seasonManual: true })));
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-s3c'), privateAppointment({ season: 2028 })));
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-s3d'), privateAppointment({ season: 2025 })));
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-s3e'), privateAppointment()));
    });

    it('rejects the next season while booking is closed', async () => {
      await seed('systemConfig', 'default', seasonConfig({ nextSeasonOpen: false }));
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-s4'), privateAppointment({ season: 2027 })));
    });

    it('lets members join with a bookable season and change only their own open entry', async () => {
      await seed('systemConfig', 'default', seasonConfig());
      await seed('workAppointments', 'wa-s5', publicAppointment([other]));
      const db = testEnv.authenticatedContext('member-1').firestore();
      const joined = participant({ season: 2027 });
      await assertSucceeds(updateDoc(doc(db, 'workAppointments', 'wa-s5'), { participants: [other, joined] }));
      await assertSucceeds(updateDoc(doc(db, 'workAppointments', 'wa-s5'), {
        participants: [other, { ...joined, season: 2026, seasonManual: true }],
      }));
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-s5'), {
        participants: [{ ...other, season: 2027 }, { ...joined, season: 2026, seasonManual: true }],
      }));
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-s5'), {
        participants: [other, { ...joined, season: 2026, seasonManual: true, status: 'confirmed' }],
      }));
    });

    it('allows admins to open and start seasons but nothing else', async () => {
      await seed('systemConfig', 'default', seasonConfig({ nextSeasonOpen: false }));
      const db = testEnv.authenticatedContext('admin-1').firestore();
      await assertSucceeds(updateDoc(doc(db, 'systemConfig', 'default'), { nextSeasonOpen: true, nextSeasonOpenedAt: new Date(), updatedAt: new Date() }));
      await assertSucceeds(updateDoc(doc(db, 'systemConfig', 'default'), { currentSeason: 2027, nextSeasonOpen: false, currentSeasonStartedAt: new Date(), updatedAt: new Date() }));
      await assertFails(updateDoc(doc(db, 'systemConfig', 'default'), { currentSeason: 2029, updatedAt: new Date() }));
      await assertFails(updateDoc(doc(db, 'systemConfig', 'default'), { currentSeason: 2026, updatedAt: new Date() }));
      await assertFails(updateDoc(doc(db, 'systemConfig', 'default'), { workHourThreshold: 1, updatedAt: new Date() }));
    });

    it('reserves backfill and activation for superadmins', async () => {
      await seed('systemConfig', 'default', seasonConfig({ seasonModelActivatedAt: null, currentSeason: null }));
      const adminDb = testEnv.authenticatedContext('admin-1').firestore();
      await assertFails(updateDoc(doc(adminDb, 'systemConfig', 'default'), { seasonModelActivatedAt: new Date(), currentSeason: 2026, nextSeasonOpen: true }));
      await assertFails(updateDoc(doc(adminDb, 'systemConfig', 'default'), { nextSeasonOpen: true }));
      const superDb = testEnv.authenticatedContext('superadmin-1').firestore();
      await assertSucceeds(updateDoc(doc(superDb, 'systemConfig', 'default'), { seasonModelActivatedAt: new Date(), currentSeason: 2026, nextSeasonOpen: true }));
    });
  });

  describe('participant list integrity', () => {
    it('denies appending oneself as confirmed behind other participants', async () => {
      await seed('workAppointments', 'wa-p1', publicAppointment([other]));
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-p1'), { participants: [other, participant({ status: 'confirmed' })] }));
    });

    it('denies removing or altering other participants', async () => {
      const mine = participant();
      await seed('workAppointments', 'wa-p2', publicAppointment([other, mine]));
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-p2'), { participants: [mine] }));
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-p2'), { participants: [{ ...other, status: 'declined' }, mine] }));
    });

    it('allows the only participant to leave', async () => {
      await seed('workAppointments', 'wa-p3', publicAppointment([participant()]));
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertSucceeds(updateDoc(doc(db, 'workAppointments', 'wa-p3'), { participants: [] }));
    });

    it('denies leaving after confirmation', async () => {
      const mine = participant({ status: 'confirmed' });
      await seed('workAppointments', 'wa-p4', publicAppointment([other, mine]));
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-p4'), { participants: [other] }));
    });

    it('denies joining a full appointment', async () => {
      await seed('workAppointments', 'wa-p5', publicAppointment([other], { maxParticipants: 1 }));
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-p5'), { participants: [other, participant()] }));
    });
  });

  describe('private work entries', () => {
    it('allows admins to create their own private entry as confirmed (no further review)', async () => {
      const db = testEnv.authenticatedContext('admin-1').firestore();
      await assertSucceeds(setDoc(doc(db, 'workAppointments', 'wa-pr-admin'), privateAppointment(
        { userId: 'admin-1', userName: 'Admin', status: 'confirmed', confirmedByUserId: 'admin-1', confirmedByUserName: 'Admin', confirmedAt: new Date() },
        { createdByUserId: 'admin-1', createdByUserName: 'Admin', boatId: '' },
      )));
    });

    it('allows admins to auto-confirm with a season once the season model is active', async () => {
      await seed('systemConfig', 'default', seasonConfig());
      const db = testEnv.authenticatedContext('admin-1').firestore();
      await assertSucceeds(setDoc(doc(db, 'workAppointments', 'wa-pr-admin-season'), privateAppointment(
        { userId: 'admin-1', userName: 'Admin', status: 'confirmed', season: 2027 },
        { createdByUserId: 'admin-1', createdByUserName: 'Admin' },
      )));
    });

    it('allows bootswarte to auto-confirm private entries only for their own boat', async () => {
      const db = testEnv.authenticatedContext('bootswart2-1').firestore();
      const own = { userId: 'bootswart2-1', userName: 'Zweiter Bootswart', status: 'confirmed' };
      const creator = { createdByUserId: 'bootswart2-1', createdByUserName: 'Zweiter Bootswart' };
      await assertSucceeds(setDoc(doc(db, 'workAppointments', 'wa-pr-bw-own'), privateAppointment(own, { ...creator, boatId: 'boat-2' })));
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-pr-bw-foreign'), privateAppointment(own, { ...creator, boatId: 'boat-1' })));
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-pr-bw-none'), privateAppointment(own, { ...creator, boatId: '' })));
    });

    it('denies creating a self-confirmed private entry', async () => {
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-pr1'), privateAppointment({ status: 'confirmed' })));
    });

    it('denies turning a private entry public or reviving a declined entry', async () => {
      await seed('workAppointments', 'wa-pr2', privateAppointment({ status: 'declined' }));
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-pr2'), { private: false }));
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-pr2'), {
        participants: [participant({ status: 'pending', startTime: new Date('2026-10-10T09:00:00Z'), endTime: new Date('2026-10-10T11:00:00Z') })],
      }));
    });

    it('allows deleting own unconfirmed private entries only', async () => {
      await seed('workAppointments', 'wa-pr3', privateAppointment());
      await seed('workAppointments', 'wa-pr4', privateAppointment({ status: 'confirmed' }));
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertSucceeds(deleteDoc(doc(db, 'workAppointments', 'wa-pr3')));
      await assertFails(deleteDoc(doc(db, 'workAppointments', 'wa-pr4')));
    });
  });

  describe('users', () => {
    it('denies admins from creating user documents and allows superadmins', async () => {
      const adminDb = testEnv.authenticatedContext('admin-1').firestore();
      await assertFails(setDoc(doc(adminDb, 'users', 'new-1'), { email: 'x@example.com', displayName: 'X', roles: ['SUPERADMIN'] }));
      const superDb = testEnv.authenticatedContext('superadmin-1').firestore();
      await assertSucceeds(setDoc(doc(superDb, 'users', 'new-2'), { email: 'y@example.com', displayName: 'Y', roles: ['MEMBER'] }));
    });

    it('restricts self-registration to base fields from the login token', async () => {
      const base = { id: 'self-1', displayName: 'Neu', onboardingState: 'not_started', createdAt: new Date(), updatedAt: new Date(), emailVerified: false };
      const applicant = testEnv.authenticatedContext('self-1', { email: 'neu@example.com' }).firestore();
      await assertFails(setDoc(doc(applicant, 'users', 'self-1'), { ...base, email: 'neu@example.com', roles: ['APPLICANT'], feesPaid: true }));
      await assertFails(setDoc(doc(applicant, 'users', 'self-1'), { ...base, email: 'neu@example.com', roles: ['APPLICANT'], feesPaid: false, skipHours: true }));
      await assertFails(setDoc(doc(applicant, 'users', 'self-1'), { ...base, email: 'anders@example.com', roles: ['APPLICANT'], feesPaid: false }));
      await assertSucceeds(setDoc(doc(applicant, 'users', 'self-1'), { ...base, email: 'neu@example.com', roles: ['APPLICANT'], feesPaid: false }));

      const domainMember = testEnv.authenticatedContext('self-2', { email: 'neu@mitglied.segelgruppe-kiel.de' }).firestore();
      await assertSucceeds(setDoc(doc(domainMember, 'users', 'self-2'), { ...base, id: 'self-2', email: 'neu@mitglied.segelgruppe-kiel.de', roles: ['MEMBER'], feesPaid: false }));
    });

    it('limits admins to fee and exemption flags', async () => {
      const db = testEnv.authenticatedContext('admin-1').firestore();
      await assertSucceeds(updateDoc(doc(db, 'users', 'member-1'), { feesPaid: false, skipHours: true, updatedAt: new Date() }));
      await assertFails(updateDoc(doc(db, 'users', 'superadmin-1'), { roles: ['MEMBER'] }));
      await assertFails(updateDoc(doc(db, 'users', 'member-1'), { roles: ['ADMIN'] }));
      await assertFails(deleteDoc(doc(db, 'users', 'member-1')));
    });
  });

  describe('reservations and public feed', () => {
    const reservation = (overrides: Record<string, unknown> = {}) => ({
      boatId: 'boat-1',
      userId: 'member-1',
      userName: 'Mitglied',
      title: 'Tour',
      description: '',
      startTime: new Date('2026-11-01T10:00:00Z'),
      endTime: new Date('2026-11-01T12:00:00Z'),
      status: 'pending',
      visibility: 'private',
      eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('denies members from creating approved reservations on boats that require approval', async () => {
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(setDoc(doc(db, 'boatReservations', 'res-1'), reservation({ status: 'approved' })));
      await assertSucceeds(setDoc(doc(db, 'boatReservations', 'res-1b'), reservation({ status: 'pending' })));
    });

    it('allows approved reservations without approval requirement and denies blocked boats', async () => {
      await seed('boats', 'boat-free', { name: 'Jolle', requiresApproval: false, blocked: false, color: '#000' });
      await seed('boats', 'boat-blocked', { name: 'Kaputt', requiresApproval: false, blocked: true, color: '#000' });
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertSucceeds(setDoc(doc(db, 'boatReservations', 'res-2'), reservation({ boatId: 'boat-free', status: 'approved' })));
      await assertFails(setDoc(doc(db, 'boatReservations', 'res-3'), reservation({ boatId: 'boat-blocked', status: 'pending' })));
      await assertSucceeds(setDoc(doc(db, 'boatReservations', 'res-4'), reservation({ boatId: 'boat-blocked', status: 'draft' })));
    });

    it('requires paid fees for final reservations even with an hours exemption', async () => {
      await seed('users', 'exempt-1', { email: 'e@example.com', displayName: 'Befreit', roles: ['MEMBER'], feesPaid: false, skipHours: true });
      const db = testEnv.authenticatedContext('exempt-1').firestore();
      await assertFails(setDoc(doc(db, 'boatReservations', 'res-5'), reservation({ userId: 'exempt-1', userName: 'Befreit' })));
    });

    it('limits bootswarte to status decisions on reservations', async () => {
      await seed('boatReservations', 'res-6', reservation({ boatId: 'boat-2' }));
      const db = testEnv.authenticatedContext('bootswart2-1').firestore();
      await assertFails(updateDoc(doc(db, 'boatReservations', 'res-6'), { title: 'Umbenannt', updatedAt: new Date() }));
      await assertFails(updateDoc(doc(db, 'boatReservations', 'res-6'), { boatId: 'boat-1', updatedAt: new Date() }));
      await assertSucceeds(updateDoc(doc(db, 'boatReservations', 'res-6'), { status: 'rejected', updatedAt: new Date() }));
    });

    it('accepts a matching public projection from the owner and rejects tampered ones', async () => {
      await seed('boatReservations', 'res-7', reservation({ visibility: 'public', publicDetails: { freeSeatsText: '2 Plätze' } }));
      const db = testEnv.authenticatedContext('member-1').firestore();
      const projection = {
        id: 'res-7',
        boatId: 'boat-1',
        boatName: 'Laser',
        title: 'Tour',
        startTime: new Date('2026-11-01T10:00:00Z'),
        endTime: new Date('2026-11-01T12:00:00Z'),
        visibility: 'public',
        reservationStatus: 'pending',
        freeSeatsText: '2 Plätze',
        updatedAt: new Date(),
      };
      await assertFails(setDoc(doc(db, 'publicBoatReservations', 'res-7'), { ...projection, reservationStatus: 'approved' }));
      await assertFails(setDoc(doc(db, 'publicBoatReservations', 'res-7'), { ...projection, boatName: 'Werbung' }));
      await assertFails(setDoc(doc(db, 'publicBoatReservations', 'res-7'), { ...projection, freeSeatsText: 'Spam' }));
      await assertSucceeds(setDoc(doc(db, 'publicBoatReservations', 'res-7'), projection));
    });
  });

  describe('boats and work appointments for bootswarte', () => {
    it('denies bootswarte from changing the boat assignment', async () => {
      const db = testEnv.authenticatedContext('bootswart2-1').firestore();
      await assertFails(updateDoc(doc(db, 'boats', 'boat-2'), { bootswart2: 'member-1' }));
      await assertFails(updateDoc(doc(db, 'boats', 'boat-2'), { name: 'Neu' }));
      await assertSucceeds(updateDoc(doc(db, 'boats', 'boat-2'), { blocked: true, updatedAt: new Date() }));
    });

    it('lets bootswarte move their appointments to other boats but not to no boat', async () => {
      await seed('workAppointments', 'wa-b1', publicAppointment([], { boatId: 'boat-2' }));
      const db = testEnv.authenticatedContext('bootswart2-1').firestore();
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-b1'), { boatId: '' }));
      await assertFails(updateDoc(doc(db, 'workAppointments', 'wa-b1'), { boatId: 'boat-unknown' }));
      await assertSucceeds(updateDoc(doc(db, 'workAppointments', 'wa-b1'), { title: 'Neu', boatId: 'boat-2' }));
      await assertSucceeds(updateDoc(doc(db, 'workAppointments', 'wa-b1'), { boatId: 'boat-1' }));
    });

    it('lets bootswarte create empty public appointments for other boats with proof of their own boat', async () => {
      const db = testEnv.authenticatedContext('bootswart2-1').firestore();
      await assertSucceeds(setDoc(doc(db, 'workAppointments', 'wa-b2'), publicAppointment([], { boatId: 'boat-1', createdAsBootswartOfBoatId: 'boat-2' })));
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-b3'), publicAppointment([], { boatId: 'boat-1' })));
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-b4'), publicAppointment([participant({ userId: 'bootswart2-1', status: 'confirmed' })], { boatId: 'boat-1', createdAsBootswartOfBoatId: 'boat-2' })));
      await assertFails(setDoc(doc(db, 'workAppointments', 'wa-b5'), publicAppointment([], { boatId: '', createdAsBootswartOfBoatId: 'boat-2' })));
      const memberDb = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(setDoc(doc(memberDb, 'workAppointments', 'wa-b6'), publicAppointment([], { boatId: 'boat-1', createdAsBootswartOfBoatId: 'boat-2' })));
    });

    it('allows only admins to delete confirmed private entries', async () => {
      await seed('workAppointments', 'wa-b7', privateAppointment({ status: 'confirmed' }, { boatId: 'boat-2' }));
      await seed('workAppointments', 'wa-b8', privateAppointment({ status: 'pending' }, { boatId: 'boat-2' }));
      const bwDb = testEnv.authenticatedContext('bootswart2-1').firestore();
      await assertFails(deleteDoc(doc(bwDb, 'workAppointments', 'wa-b7')));
      await assertSucceeds(deleteDoc(doc(bwDb, 'workAppointments', 'wa-b8')));
      const adminDb = testEnv.authenticatedContext('admin-1').firestore();
      await assertSucceeds(deleteDoc(doc(adminDb, 'workAppointments', 'wa-b7')));
    });
  });

  describe('activity log', () => {
    const entry = (overrides: Record<string, unknown> = {}) => ({
      type: 'workHour.updated',
      entityId: 'wa-1',
      entityType: 'workHour',
      actorId: 'member-1',
      actorName: 'Mitglied',
      timestamp: new Date(),
      details: {},
      ...overrides,
    });

    it('binds entries to the signed-in user and the current time', async () => {
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertSucceeds(setDoc(doc(db, 'activityLog', 'log-1'), entry()));
      await assertFails(setDoc(doc(db, 'activityLog', 'log-2'), entry({ actorId: 'admin-1' })));
      await assertFails(setDoc(doc(db, 'activityLog', 'log-3'), entry({ timestamp: new Date('2020-01-01T00:00:00Z') })));
      await assertFails(setDoc(doc(db, 'activityLog', 'log-4'), entry({ extra: true })));
    });

    it('allows system entries for season actions', async () => {
      const db = testEnv.authenticatedContext('admin-1').firestore();
      await assertSucceeds(setDoc(doc(db, 'activityLog', 'log-5'), entry({ type: 'season.started', entityType: 'system', entityId: 'systemConfig/default', actorId: 'admin-1', actorName: 'Admin' })));
    });

    it('denies members from reading the log', async () => {
      await seed('activityLog', 'log-6', entry());
      const db = testEnv.authenticatedContext('member-1').firestore();
      await assertFails(getDoc(doc(db, 'activityLog', 'log-6')));
    });
  });
});
