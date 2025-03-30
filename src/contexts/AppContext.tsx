import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, SystemConfig, UserRole, Boat } from '../types/models';
import { useNavigate } from 'react-router-dom';
import { getAuthProvider, getDatabaseProvider } from '../services/factory';
import { CreateUserRequest, AuthUser, SignInRequest } from '../services/interfaces/auth';
import { DatabaseProvider } from '../services/interfaces/database';

interface AppContextType {
  database: DatabaseProvider;
  currentUser: User | null;
  systemConfig: SystemConfig;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;  
  isAnyBootswart: boolean;
  boats: Boat[];
  signIn: (request: SignInRequest) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  activateUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  createUserAndSendInvite: (request: CreateUserRequest) => Promise<string>;
  reloadBoats: () => Promise<void>;
}

const defaultSystemConfig: SystemConfig = {
  id: 'default',
  workHourThreshold: 25,
  yearChangeDate: new Date(new Date().getFullYear(), 0, 1),
  currentYear: new Date().getFullYear(),
}

const AppContext = createContext<AppContextType>({
  database: getDatabaseProvider(),
  currentUser: null,
  systemConfig: defaultSystemConfig,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isAnyBootswart: false,
  boats: [],
  signIn: async () => { throw new Error('Not implemented'); },
  signUp: async () => { throw new Error('Not implemented'); },
  signOut: async () => { throw new Error('Not implemented'); },
  deactivateUser: async () => { throw new Error('Not implemented'); },
  activateUser: async () => { throw new Error('Not implemented'); },
  deleteUser: async () => { throw new Error('Not implemented'); },
  createUserAndSendInvite: async () => { throw new Error('Not implemented'); },
  reloadBoats: async () => { throw new Error('Not implemented'); },
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(defaultSystemConfig);
  const [boats, setBoats] = useState<Boat []>([]);
  const [loading, setLoading] = useState(true);
  const database = useRef(getDatabaseProvider());
  const navigate = useNavigate();
  const currentUserRef = useRef<User | null>(null);

  const ensureUserDocument = async (user: AuthUser, displayName?: string) => {
    // Check if user document exists
    let userDoc = await getDatabaseProvider().getDocument<User>('users', user.uid);
    if (userDoc) {
      // update last login time
      await getDatabaseProvider().updateDocument<User>('users', user.uid, {
        lastLoginAt: new Date()
      });
    } else {
      // Create the user document in database
      await getDatabaseProvider().setDocument<User>('users', user.uid, {
        id: user.uid,
        feesPaid: false,
        email: user.email!,
        displayName: displayName || user.displayName!,
        roles: [UserRole.APPLICANT],
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: user.emailVerified,
      });
    }

    // Fetch user data from database
    userDoc = await getDatabaseProvider().getDocument('users', user.uid);
    if (userDoc) {
      currentUserRef.current = userDoc as User;
      if (!userDoc.roles?.includes(UserRole.APPLICANT)) {
        // Fetch system config
        const configDoc = await getDatabaseProvider().getDocument('systemConfig', 'default');
        if (configDoc) {
          setSystemConfig(configDoc as SystemConfig);
        } else if (isSuperAdmin) {
          await getDatabaseProvider().setDocument<SystemConfig>('systemConfig', 'default', defaultSystemConfig);
        }
      }
      // Fetch boats
      await reloadBoats();
      setCurrentUser(userDoc as User);
    }
  }

  const signIn = async (request: SignInRequest) => {
    try {
      let authUser: AuthUser;
      if (!request.provider) {
        authUser = await getAuthProvider().signIn(request.email!, request.password!);
      } else {
        authUser = await getAuthProvider().signInWithProvider(request.provider);
      }
      await ensureUserDocument(authUser);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const authUser = await getAuthProvider().signUp(email, password);
      await ensureUserDocument(authUser, displayName);
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await getAuthProvider().signOut();
      setCurrentUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }; 

  const deleteUser = async (userId: string): Promise<void> => {
    try {
      // Delete the user document from database
      await getDatabaseProvider().deleteDocument('users', userId);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const deactivateUser = async (userId: string): Promise<void> => {
    try {
      // Mark the user as deactivated and remove their roles
      await getDatabaseProvider().updateDocument('users', userId, {
        deactivated: true,
        deactivatedAt: new Date(),
        deactivatedBy: currentUser?.id,
        roles: [],  // Remove all roles
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  };

  const activateUser = async (userId: string): Promise<void> => {
    try {
      // Mark the user as active and add their roles
      await getDatabaseProvider().updateDocument('users', userId, {
        deactivated: false,
        deactivatedAt: null,
        deactivatedBy: null,
        roles: [UserRole.MEMBER],  // Add default roles
      });
    } catch (error) {
      console.error('Error activating user:', error);
      throw error;
    }
  };

  const reloadBoats = async () => {
    try {
      const dbBoats = await getDatabaseProvider().getDocuments<Boat>('boats');
      setBoats(dbBoats);
    } catch (error) {
      console.error('Error loading boats:', error);
    }
  };

  const createUserAndSendInvite = async (request: CreateUserRequest) => {
    // TODO: Firebase will always log in the session of the created user which breaks the creation process, disable for now
    try {
      //await createUser(email, displayName);
      //await sendInvite(email);
    } catch (error) {
      console.error('Error creating user and sending invite:', error);
    }
    throw new Error('Not implemented');
  };

  useEffect(() => {
    const unsubscribe = getAuthProvider().onAuthStateChanged(async (authUser) => {
      if (!authUser) {
        currentUserRef.current = null;
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = currentUser?.roles.includes(UserRole.ADMIN) || currentUser?.roles.includes(UserRole.SUPERADMIN) || false;
  const isSuperAdmin = currentUser?.roles.includes(UserRole.SUPERADMIN) || false;
  const isAnyBootswart = boats.some(boat => boat.bootswart === currentUser?.id!);

  return (
    <AppContext.Provider 
      value={{
        currentUser, 
        systemConfig, 
        loading,
        isAdmin,
        isSuperAdmin,
        isAnyBootswart,
        boats,
        database: database.current,
        signIn,
        signUp,
        signOut,
        deactivateUser,
        activateUser,
        deleteUser,
        createUserAndSendInvite,
        reloadBoats
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
