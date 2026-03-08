/**
 * Seed script for the local Firebase emulator.
 * Creates test users, boats, work appointments, and reservations.
 *
 * Uses the Firebase Admin SDK (bypasses Firestore security rules) and the
 * Auth emulator REST API to create users.
 *
 * Usage:
 *   node scripts/seed-emulator.mjs
 *
 * Requires the emulator to be running (firebase emulators:start --only firestore,auth)
 */

import admin from 'firebase-admin';

// Point Admin SDK at the emulators — must be set before initializeApp
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9098';

const app = admin.initializeApp({ projectId: 'sgfh-tracking-test' });
const auth = admin.auth(app);
const db = admin.firestore(app);

const now = admin.firestore.Timestamp.now();
const yearAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAuthUser(email, password, displayName) {
  try {
    const existing = await auth.getUserByEmail(email);
    return existing.uid;
  } catch {
    const user = await auth.createUser({ email, password, displayName });
    return user.uid;
  }
}

async function setUser(uid, data) {
  await db.collection('users').doc(uid).set({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

console.log('Creating auth users...');

const adminUid = await createAuthUser(
  'admin@segelgruppe-kiel.de',
  'password123',
  'Admin User'
);
const bootswartUid = await createAuthUser(
  'bootswart@segelgruppe-kiel.de',
  'password123',
  'Bootswart Hansen'
);
const memberUid = await createAuthUser(
  'member@segelgruppe-kiel.de',
  'password123',
  'Max Mustermann'
);
const memberNoFeesUid = await createAuthUser(
  'member-nofees@segelgruppe-kiel.de',
  'password123',
  'Lisa Ohnegebühr'
);
const memberSkipHoursUid = await createAuthUser(
  'member-skiphours@segelgruppe-kiel.de',
  'password123',
  'Hans Freigestellt'
);

console.log('Creating Firestore user documents...');

await setUser(adminUid, {
  email: 'admin@segelgruppe-kiel.de',
  displayName: 'Admin User',
  roles: ['SUPERADMIN'],
  feesPaid: true,
  skipHours: true,
  onboardingState: 'completed',
});

await setUser(bootswartUid, {
  email: 'bootswart@segelgruppe-kiel.de',
  displayName: 'Bootswart Hansen',
  roles: ['MEMBER'],
  feesPaid: true,
  onboardingState: 'completed',
});

await setUser(memberUid, {
  email: 'member@segelgruppe-kiel.de',
  displayName: 'Max Mustermann',
  roles: ['MEMBER'],
  feesPaid: true,
  onboardingState: 'not_started',
});

await setUser(memberNoFeesUid, {
  email: 'member-nofees@segelgruppe-kiel.de',
  displayName: 'Lisa Ohnegebühr',
  roles: ['MEMBER'],
  feesPaid: false,
  onboardingState: 'completed',
});

await setUser(memberSkipHoursUid, {
  email: 'member-skiphours@segelgruppe-kiel.de',
  displayName: 'Hans Freigestellt',
  roles: ['MEMBER'],
  feesPaid: true,
  skipHours: true,
  onboardingState: 'completed',
});

// ---------------------------------------------------------------------------
// System Config
// ---------------------------------------------------------------------------

console.log('Creating system config...');

await db.collection('systemConfig').doc('config').set({
  yearChangeDate: admin.firestore.Timestamp.fromDate(new Date('2000-04-01')),
  workHourThreshold: 8,
  featureFlags: { enableMemberCreation: true },
  createdAt: now,
  updatedAt: now,
});

// ---------------------------------------------------------------------------
// Boats
// ---------------------------------------------------------------------------

console.log('Creating boats...');

await db.collection('boats').doc('boat-laser').set({
  name: 'Laser',
  description: 'Einhandjolle für schnelle Touren',
  bootswart: bootswartUid,
  requiresApproval: true,
  blocked: false,
  color: '#1976d2',
  createdAt: now,
  updatedAt: now,
});

await db.collection('boats').doc('boat-optim').set({
  name: 'Optimist',
  description: 'Jugendboot, direkt reservierbar',
  bootswart: bootswartUid,
  requiresApproval: false,
  blocked: false,
  color: '#388e3c',
  createdAt: now,
  updatedAt: now,
});

await db.collection('boats').doc('boat-blocked').set({
  name: 'Piraten (gesperrt)',
  description: 'Derzeit in Wartung',
  bootswart: bootswartUid,
  requiresApproval: false,
  blocked: true,
  color: '#d32f2f',
  createdAt: now,
  updatedAt: now,
});

// ---------------------------------------------------------------------------
// Work Appointments
// ---------------------------------------------------------------------------

console.log('Creating work appointments...');

const workDate1 = new Date();
workDate1.setDate(workDate1.getDate() - 30);
workDate1.setHours(9, 0, 0, 0);
const workDate1End = new Date(workDate1);
workDate1End.setHours(13, 0, 0, 0);

await db.collection('workAppointments').doc('wa-past-1').set({
  title: 'Bootsputztag',
  description: 'Frühjahrsputz aller Boote',
  startTime: admin.firestore.Timestamp.fromDate(workDate1),
  endTime: admin.firestore.Timestamp.fromDate(workDate1End),
  boatId: 'boat-laser',
  maxParticipants: 6,
  participants: [
    { userId: memberUid, userName: 'Max Mustermann', status: 'confirmed', createdAt: now, updatedAt: now },
    { userId: memberSkipHoursUid, userName: 'Hans Freigestellt', status: 'confirmed', createdAt: now, updatedAt: now },
  ],
  supplies: ['Eimer', 'Schwämme', 'Bootspolitur'],
  private: false,
  createdAt: now,
  updatedAt: now,
});

const workDate2 = new Date();
workDate2.setDate(workDate2.getDate() - 10);
workDate2.setHours(10, 0, 0, 0);
const workDate2End = new Date(workDate2);
workDate2End.setHours(14, 0, 0, 0);

await db.collection('workAppointments').doc('wa-past-2').set({
  title: 'Segelreparatur',
  description: 'Segel flicken und verstauen',
  startTime: admin.firestore.Timestamp.fromDate(workDate2),
  endTime: admin.firestore.Timestamp.fromDate(workDate2End),
  participants: [
    { userId: memberUid, userName: 'Max Mustermann', status: 'pending', createdAt: now, updatedAt: now },
  ],
  supplies: [],
  private: false,
  createdAt: now,
  updatedAt: now,
});

const workDateFuture = new Date();
workDateFuture.setDate(workDateFuture.getDate() + 14);
workDateFuture.setHours(9, 0, 0, 0);
const workDateFutureEnd = new Date(workDateFuture);
workDateFutureEnd.setHours(12, 0, 0, 0);

await db.collection('workAppointments').doc('wa-future-1').set({
  title: 'Slip-Arbeit',
  description: 'Boote auf den Slip bringen',
  startTime: admin.firestore.Timestamp.fromDate(workDateFuture),
  endTime: admin.firestore.Timestamp.fromDate(workDateFutureEnd),
  maxParticipants: 4,
  participants: [],
  supplies: ['Handschuhe', 'Seile'],
  private: false,
  createdAt: now,
  updatedAt: now,
});

// ---------------------------------------------------------------------------
// Boat Reservations
// ---------------------------------------------------------------------------

console.log('Creating boat reservations...');

const res1Start = new Date();
res1Start.setDate(res1Start.getDate() + 3);
res1Start.setHours(9, 0, 0, 0);
const res1End = new Date(res1Start);
res1End.setHours(17, 0, 0, 0);

// Approved reservation by Bootswart (owns boat, requiresApproval=true → auto-approved)
await db.collection('boatReservations').doc('res-approved-1').set({
  boatId: 'boat-laser',
  userId: bootswartUid,
  userName: 'Bootswart Hansen',
  title: 'Trainingsfahrt',
  description: 'Regatta-Vorbereitung',
  startTime: admin.firestore.Timestamp.fromDate(res1Start),
  endTime: admin.firestore.Timestamp.fromDate(res1End),
  status: 'approved',
  visibility: 'public',
  publicDetails: { freeSeatsText: '2 Plätze frei' },
  eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
  createdAt: now,
  updatedAt: now,
});

// Also create the public projection
await db.collection('publicBoatReservations').doc('res-approved-1').set({
  boatId: 'boat-laser',
  boatName: 'Laser',
  title: 'Trainingsfahrt',
  startTime: admin.firestore.Timestamp.fromDate(res1Start),
  endTime: admin.firestore.Timestamp.fromDate(res1End),
  visibility: 'public',
  reservationStatus: 'approved',
  freeSeatsText: '2 Plätze frei',
  updatedAt: now,
});

const res2Start = new Date();
res2Start.setDate(res2Start.getDate() + 7);
res2Start.setHours(10, 0, 0, 0);
const res2End = new Date(res2Start);
res2End.setHours(16, 0, 0, 0);

// Pending reservation by member on requiresApproval boat
await db.collection('boatReservations').doc('res-pending-1').set({
  boatId: 'boat-laser',
  userId: memberUid,
  userName: 'Max Mustermann',
  title: 'Wochenendtour',
  description: '',
  startTime: admin.firestore.Timestamp.fromDate(res2Start),
  endTime: admin.firestore.Timestamp.fromDate(res2End),
  status: 'pending',
  visibility: 'private',
  eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
  createdAt: now,
  updatedAt: now,
});

const res3Start = new Date();
res3Start.setDate(res3Start.getDate() + 5);
res3Start.setHours(8, 0, 0, 0);
const res3End = new Date(res3Start);
res3End.setHours(12, 0, 0, 0);

// Draft reservation by member on non-requiresApproval boat
await db.collection('boatReservations').doc('res-draft-1').set({
  boatId: 'boat-optim',
  userId: memberUid,
  userName: 'Max Mustermann',
  title: 'Vormerkung Optimist',
  description: 'Evtl. mit Familie',
  startTime: admin.firestore.Timestamp.fromDate(res3Start),
  endTime: admin.firestore.Timestamp.fromDate(res3End),
  status: 'draft',
  visibility: 'private',
  eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
  createdAt: now,
  updatedAt: now,
});

const res4Start = new Date();
res4Start.setDate(res4Start.getDate() - 5);
res4Start.setHours(9, 0, 0, 0);
const res4End = new Date(res4Start);
res4End.setHours(14, 0, 0, 0);

// Past approved reservation
await db.collection('boatReservations').doc('res-past-1').set({
  boatId: 'boat-optim',
  userId: memberSkipHoursUid,
  userName: 'Hans Freigestellt',
  title: 'Vergangenheitsfahrt',
  description: '',
  startTime: admin.firestore.Timestamp.fromDate(res4Start),
  endTime: admin.firestore.Timestamp.fromDate(res4End),
  status: 'approved',
  visibility: 'private',
  eligibilitySnapshot: { feesPaid: true, skipHours: true, workHoursMet: true },
  createdAt: yearAgo,
  updatedAt: yearAgo,
});

console.log('\n✅ Emulator seeded successfully!\n');
console.log('Test accounts:');
console.log('  admin@segelgruppe-kiel.de       / password123  (Admin)');
console.log('  bootswart@segelgruppe-kiel.de   / password123  (Bootswart für Laser + Optimist)');
console.log('  member@segelgruppe-kiel.de      / password123  (Mitglied, Gebühren bezahlt)');
console.log('  member-nofees@segelgruppe-kiel.de / password123 (Mitglied, Gebühren NICHT bezahlt)');
console.log('  member-skiphours@segelgruppe-kiel.de / password123 (Mitglied, Stunden freigestellt)');
console.log('\nEmulator UI: http://localhost:4000');
