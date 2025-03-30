import { CustomAuthProvider } from './interfaces/auth';
import { DatabaseProvider } from './interfaces/database';
import { FirebaseAuthProvider } from './providers/firebase/auth';
import { FirebaseDatabaseProvider } from './providers/firebase/database';
import { auth, db } from '../config/firebase';

let authProvider: CustomAuthProvider | null = null;
let databaseProvider: DatabaseProvider | null = null;

export function getAuthProvider(): CustomAuthProvider {
  if (!authProvider) {
    // Initialize providers
    authProvider = new FirebaseAuthProvider(auth);
  }
  return authProvider;
}

export function getDatabaseProvider(): DatabaseProvider {
  if (!databaseProvider) {
    // Initialize providers
    databaseProvider = new FirebaseDatabaseProvider(db);
  }
  return databaseProvider;
}

// For testing or switching providers
export function setProviders(auth: CustomAuthProvider, database: DatabaseProvider) {
  authProvider = auth;
  databaseProvider = database;
}
