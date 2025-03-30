import { 
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPopup,
  User as FirebaseUser,
  sendPasswordResetEmail,
  AuthProvider
} from 'firebase/auth';
import { CustomAuthProvider, AuthUser, AuthError, CreateUserRequest } from '../../interfaces/auth';

export class FirebaseAuthProvider implements CustomAuthProvider {
  constructor(
    private auth: Auth,
  ) {}

  private mapUser(user: FirebaseUser | null): AuthUser | null {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
    };
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      const user = this.mapUser(result.user);
      if (!user) throw new Error('User not found after sign in');
      return user;
    } catch (error: any) {
      throw this.mapError(error);
    }
  }

  async signUp(email: string, password: string): Promise<AuthUser> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = this.mapUser(result.user);
      if (!user) throw new Error('User not found after sign up');
      return user;
    } catch (error: any) {
      throw this.mapError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(this.auth);
    } catch (error: any) {
      throw this.mapError(error);
    }
  }

  getCurrentUser(): AuthUser | null {
    return this.mapUser(this.auth.currentUser);
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return firebaseOnAuthStateChanged(this.auth, (user) => {
      callback(this.mapUser(user));
    });
  }

  async signInWithProvider(provider: AuthProvider): Promise<AuthUser> {
    try {
      const result = await signInWithPopup(this.auth, provider);
      const user = this.mapUser(result.user);
      if (!user) throw new Error('User not found after Google sign in');
      return user;
    } catch (error: any) {
      throw this.mapError(error);
    }
  }

  private mapError(error: any): AuthError {
    const authError: AuthError = new Error(error.message);
    authError.code = error.code;
    return authError;
  }

  async createUser(request: CreateUserRequest): Promise<AuthUser> {
    try {
      // Generate a random temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, request.email, tempPassword);
      const { user } = userCredential;

      // Map the user to AuthUser
      const authUser = this.mapUser(user);

      return authUser as AuthUser;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw this.mapError(error);
    }
  }

  async sendPasswordReset(email: string): Promise<void> {
    try {
      // Send password reset email
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      throw this.mapError(error);
    }
  }
}
