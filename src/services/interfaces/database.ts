export interface DatabaseDocument {
  id: string;
  [key: string]: any;
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'array-contains';
  value: any;
}

export interface DatabaseProvider {
  // Document operations
  addDocument(collection: string, data: any): Promise<string>;
  getDocument<T extends DatabaseDocument>(collection: string, id: string): Promise<T | null>;
  getDocuments<T extends DatabaseDocument>(collection: string, filters?: QueryFilter[]): Promise<T[]>;
  setDocument<T extends DatabaseDocument>(collection: string, id: string, data: T): Promise<void>;
  updateDocument<T extends DatabaseDocument>(collection: string, id: string, data: Partial<T>): Promise<void>;
  deleteDocument(collection: string, id: string): Promise<void>;
  deleteDocuments(collection: string, ids: string[]): Promise<void>;

  // Array operations
  arrayUnion<T extends DatabaseDocument>(collection: string, id: string, field: keyof T, elements: any[]): Promise<void>;
  arrayRemove<T extends DatabaseDocument>(collection: string, id: string, field: keyof T, elements: any[]): Promise<void>;
  
  // Collection operations
  query<T extends DatabaseDocument>(collection: string, filters?: QueryFilter[]): Promise<T[]>;
  
  // Batch operations
  runTransaction<T>(updateFunction: () => Promise<T>): Promise<T>;
  
  // Real-time updates
  onDocumentChanged<T extends DatabaseDocument>(
    collection: string,
    id: string,
    callback: (doc: T | null) => void
  ): () => void;
  
  onCollectionChanged<T extends DatabaseDocument>(
    collection: string,
    filters: QueryFilter[],
    callback: (docs: T[]) => void
  ): () => void;
}
