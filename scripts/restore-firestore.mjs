/**
 * Firestore Restore Script
 *
 * Imports Firestore documents from a backup directory produced by backup-firestore.mjs.
 * Existing documents are overwritten. Collections not in the backup are left untouched.
 *
 * Usage:
 *   node scripts/restore-firestore.mjs <backup-dir>
 *
 *   # Dry-run (validates backup files without writing to Firestore)
 *   DRY_RUN=true node scripts/restore-firestore.mjs <backup-dir>
 *
 * Environment variables:
 *   FIREBASE_PROJECT_ID       - Firebase project ID (required)
 *   FIREBASE_SERVICE_ACCOUNT  - Service account JSON as string (for CI)
 *   DRY_RUN                   - Set to "true" to validate without writing
 *
 * Example:
 *   FIREBASE_PROJECT_ID=sgfh-tracking node scripts/restore-firestore.mjs backup/2025-06-01T02-00-00
 */

import admin from 'firebase-admin';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
if (!PROJECT_ID) {
  console.error('❌ FIREBASE_PROJECT_ID environment variable is required.');
  process.exit(1);
}

const DRY_RUN = process.env.DRY_RUN === 'true';

const backupDir = process.argv[2];
if (!backupDir) {
  console.error('❌ Usage: node scripts/restore-firestore.mjs <backup-dir>');
  console.error('   Example: node scripts/restore-firestore.mjs backup/2025-06-01T02-00-00');
  process.exit(1);
}

if (!existsSync(backupDir)) {
  console.error(`❌ Backup directory not found: ${backupDir}`);
  process.exit(1);
}

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
} else {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

/**
 * Deserialises special types encoded by the backup script back to Firestore types.
 */
function deserialise(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(deserialise);
  if (typeof value === 'object') {
    if (value._type === 'Timestamp') {
      return new admin.firestore.Timestamp(value.seconds, value.nanoseconds);
    }
    if (value._type === 'GeoPoint') {
      return new admin.firestore.GeoPoint(value.latitude, value.longitude);
    }
    if (value._type === 'DocumentReference') {
      return db.doc(value.path);
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deserialise(v)]));
  }
  return value;
}

async function restoreCollection(collectionName, filePath) {
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  const docIds = Object.keys(raw);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] ${collectionName}: would restore ${docIds.length} documents`);
    return docIds.length;
  }

  // Write in batches of 500 (Firestore limit)
  const BATCH_SIZE = 500;
  let written = 0;
  for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = docIds.slice(i, i + BATCH_SIZE);
    for (const docId of chunk) {
      const data = deserialise(raw[docId]);
      batch.set(db.collection(collectionName).doc(docId), data);
    }
    await batch.commit();
    written += chunk.length;
  }

  console.log(`  ✓ ${collectionName}: ${written} documents restored`);
  return written;
}

async function main() {
  // Read metadata if present
  const metadataPath = join(backupDir, 'metadata.json');
  let metadata = null;
  if (existsSync(metadataPath)) {
    metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  }

  console.log(`\n🔥 Firestore Restore${DRY_RUN ? ' [DRY RUN]' : ''}`);
  console.log(`   Project:    ${PROJECT_ID}`);
  console.log(`   Backup dir: ${backupDir}`);
  if (metadata) {
    console.log(`   Backed up:  ${metadata.timestamp}`);
    console.log(`   Documents:  ${metadata.totalDocuments}`);
  }
  console.log('');

  if (!DRY_RUN) {
    console.log('⚠️  This will OVERWRITE existing documents. Press Ctrl+C within 5 seconds to abort.\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Find all collection JSON files in the backup dir
  const files = readdirSync(backupDir).filter(f => f.endsWith('.json') && f !== 'metadata.json');

  let totalDocs = 0;
  for (const file of files) {
    const collectionName = basename(file, '.json');
    try {
      const count = await restoreCollection(collectionName, join(backupDir, file));
      totalDocs += count;
    } catch (err) {
      console.error(`  ❌ Failed to restore ${collectionName}: ${err.message}`);
    }
  }

  console.log(`\n✅ Restore complete: ${totalDocs} documents${DRY_RUN ? ' (dry run — nothing written)' : ''}\n`);
}

main().catch(err => {
  console.error('❌ Restore failed:', err);
  process.exit(1);
});
