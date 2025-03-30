import {
  Firestore,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch,
  query,
  where,
  onSnapshot,
  runTransaction as firebaseRunTransaction,
  DocumentData,
  QueryConstraint,
  WhereFilterOp,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  Timestamp,
  WithFieldValue,
  PartialWithFieldValue,
  SetOptions,
  arrayUnion as firestoreArrayUnion,
  arrayRemove as firestoreArrayRemove,
} from 'firebase/firestore';
import { DatabaseProvider, DatabaseDocument, QueryFilter } from '../../interfaces/database';

export class FirebaseDatabaseProvider implements DatabaseProvider {
  constructor(private db: Firestore) {}

  private mapOperator(operator: QueryFilter['operator']): WhereFilterOp {
    switch (operator) {
      case 'eq': return '==';
      case 'ne': return '!=';
      case 'gt': return '>';
      case 'gte': return '>=';
      case 'lt': return '<';
      case 'lte': return '<=';
      case 'in': return 'in';
      case 'nin': return 'not-in';
      case 'contains':
      case 'array-contains': return 'array-contains';
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  private mapValue(value: QueryFilter['value']): any {
    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }
    return value;
  }

  private mapFilter(filter: QueryFilter): QueryConstraint {
    return where(filter.field, this.mapOperator(filter.operator), this.mapValue(filter.value));
  }

  private getConverter<T extends DatabaseDocument>(): FirestoreDataConverter<T> {
    return {
      toFirestore: (modelObject: WithFieldValue<T> | PartialWithFieldValue<T>, options?: SetOptions): DocumentData => {
        const convertToFirestore = (value: any): any => {
          if (value instanceof Date) {
            return Timestamp.fromDate(value);
          } else if (Array.isArray(value)) {
            return value.map(item => convertToFirestore(item));
          } else if (value && typeof value === 'object') {
            const converted: DocumentData = {};
            for (const [k, v] of Object.entries(value)) {
              converted[k] = convertToFirestore(v);
            }
            return converted;
          }
          return value;
        };

        const result: DocumentData = {};
        for (const [key, value] of Object.entries(modelObject)) {
          result[key] = convertToFirestore(value);
        }
        return result;
      },
      fromFirestore: (snapshot: QueryDocumentSnapshot): T => {
        const convertFromFirestore = (value: any): any => {
          if (value instanceof Timestamp) {
            return value.toDate();
          } else if (Array.isArray(value)) {
            return value.map(item => convertFromFirestore(item));
          } else if (value && typeof value === 'object') {
            const converted: any = {};
            for (const [k, v] of Object.entries(value)) {
              converted[k] = convertFromFirestore(v);
            }
            return converted;
          }
          return value;
        };

        const data = snapshot.data();
        const result = {} as T;
        for (const [key, value] of Object.entries(data)) {
          (result as any)[key] = convertFromFirestore(value);
        }
        result.id = snapshot.id;
        return result;
      }
    };
  }

  async addDocument(collectionName: string, data: any): Promise<string> {
    const docRef = await addDoc(collection(this.db, collectionName), data);
    return docRef.id;
  }

  async getDocument<T extends DatabaseDocument>(collection: string, id: string): Promise<T | null> {
    const docRef = doc(this.db, collection, id).withConverter(this.getConverter<T>());
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  async getDocuments<T extends DatabaseDocument>(collectionName: string, filters?: QueryFilter[]): Promise<T[]> { 
    const collectionRef = collection(this.db, collectionName).withConverter(this.getConverter<T>());
    const constraints = filters?.map(filter => this.mapFilter(filter)) || [];
    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  }

  async setDocument<T extends DatabaseDocument>(collection: string, id: string, data: T): Promise<void> {
    const docRef = doc(this.db, collection, id).withConverter(this.getConverter<T>());
    await setDoc(docRef, data);
  }

  async updateDocument<T extends DatabaseDocument>(collection: string, id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(this.db, collection, id).withConverter(this.getConverter<T>());
    await updateDoc(docRef, data as WithFieldValue<T>);
  }

  async deleteDocument(collection: string, id: string): Promise<void> {
    const docRef = doc(this.db, collection, id);
    await deleteDoc(docRef);
  }

  async deleteDocuments(collection: string, ids: string[]): Promise<void> {
    const batch = writeBatch(this.db);
    ids.forEach(id => {
      const docRef = doc(this.db, collection, id);
      batch.delete(docRef);
    });
    await batch.commit();
  }

  async arrayUnion<T extends DatabaseDocument>(collection: string, id: string, field: keyof T, elements: any[]): Promise<void> {
    const docRef = doc(this.db, collection, id);
    await updateDoc(docRef, {
      [field]: firestoreArrayUnion(...elements)
    });
  }

  async arrayRemove<T extends DatabaseDocument>(collection: string, id: string, field: keyof T, elements: any[]): Promise<void> {
    const docRef = doc(this.db, collection, id);
    await updateDoc(docRef, {
      [field]: firestoreArrayRemove(...elements)
    });
  }

  async query<T extends DatabaseDocument>(collectionName: string, filters: QueryFilter[] = []): Promise<T[]> {
    const collectionRef = collection(this.db, collectionName).withConverter(this.getConverter<T>());
    const constraints = filters.map(filter => this.mapFilter(filter));
    const q = query(collectionRef, ...constraints);
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  }

  async runTransaction<T>(updateFunction: () => Promise<T>): Promise<T> {
    return firebaseRunTransaction(this.db, updateFunction);
  }

  onDocumentChanged<T extends DatabaseDocument>(
    collectionName: string,
    id: string,
    callback: (doc: T | null) => void
  ): () => void {
    const docRef = doc(this.db, collectionName, id).withConverter(this.getConverter<T>());
    return onSnapshot(docRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.data() : null);
    });
  }

  onCollectionChanged<T extends DatabaseDocument>(
    collectionName: string,
    filters: QueryFilter[],
    callback: (docs: T[]) => void
  ): () => void {
    const collectionRef = collection(this.db, collectionName).withConverter(this.getConverter<T>());
    const constraints = filters.map(filter => this.mapFilter(filter));
    const q = query(collectionRef, ...constraints);
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data()));
    });
  }
}
