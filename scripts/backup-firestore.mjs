/**
 * Firestore Backup Script
 *
 * Exports all Firestore collections to JSON files in a timestamped directory.
 * Designed to run in GitHub Actions with a Firebase Service Account.
 *
 * Usage:
 *   node scripts/backup-firestore.mjs
 *
 * Environment variables:
 *   FIREBASE_PROJECT_ID       - Firebase project ID (required)
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON (required in CI)
 *   FIREBASE_SERVICE_ACCOUNT  - Service account JSON as string (alternative for CI)
 *   BACKUP_DIR                - Output directory (default: ./backup)
 */

import admin from 'firebase-admin';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
if (!PROJECT_ID) {
  console.error('❌ FIREBASE_PROJECT_ID environment variable is required.');
  process.exit(1);
}

// Support service account JSON passed as an env var string (GitHub Actions secret)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
} else {
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

const COLLECTIONS = [
  'users',
  'boats',
  'boatReservations',
  'publicBoatReservations',
  'workAppointments',
  'workHours',
  'systemConfig',
];

/**
 * Converts Firestore Timestamps and other special types to plain JSON-serialisable values.
 */
function serialise(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof admin.firestore.Timestamp) return { _type: 'Timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (value instanceof admin.firestore.GeoPoint) return { _type: 'GeoPoint', latitude: value.latitude, longitude: value.longitude };
  if (value instanceof admin.firestore.DocumentReference) return { _type: 'DocumentReference', path: value.path };
  if (Array.isArray(value)) return value.map(serialise);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialise(v)]));
  }
  return value;
}

async function backupCollection(collectionName, outputDir) {
  const snapshot = await db.collection(collectionName).get();
  const docs = {};
  snapshot.forEach(doc => {
    docs[doc.id] = serialise(doc.data());
  });
  const filePath = join(outputDir, `${collectionName}.json`);
  writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
  console.log(`  ✓ ${collectionName}: ${snapshot.size} documents → ${filePath}`);
  return snapshot.size;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupRoot = process.env.BACKUP_DIR || './backup';
  const outputDir = join(backupRoot, timestamp);

  mkdirSync(outputDir, { recursive: true });

  console.log(`\n🔥 Starting Firestore backup`);
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`   Output:  ${outputDir}\n`);

  let totalDocs = 0;
  for (const col of COLLECTIONS) {
    try {
      const count = await backupCollection(col, outputDir);
      totalDocs += count;
    } catch (err) {
      console.warn(`  ⚠ Skipped ${col}: ${err.message}`);
    }
  }

  const metadata = {
    projectId: PROJECT_ID,
    timestamp: new Date().toISOString(),
    collections: COLLECTIONS,
    totalDocuments: totalDocs,
    scriptVersion: '1.0.0',
  };
  writeFileSync(join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

  console.log(`\n✅ Backup complete: ${totalDocs} documents in ${outputDir}`);
  console.log(`   Metadata: ${join(outputDir, 'metadata.json')}\n`);
}

main().catch(err => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
