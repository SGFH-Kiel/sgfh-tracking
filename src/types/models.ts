export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  APPLICANT = 'APPLICANT'
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  deactivated?: boolean;
  roles: UserRole[];
  feesPaid: boolean;
  skipHours?: boolean;
  onboardingState?: 'not_started' | 'skipped' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  emailVerified?: boolean;
  lastLoginAt?: Date;
}

export interface Boat {
  id: string;
  name: string;
  description?: string;
  bootswart?: string; // User ID of Bootswart
  requiresApproval: boolean; // Whether reservations need bootswart approval
  blocked: boolean; // Whether the boat is currently blocked
  color: string; // CSS color value
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkAppointment {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  boatId?: string;
  maxParticipants?: number;
  participants: WorkParticipant[];
  supplies: Supply[];
  private?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type Supply = string;

export interface WorkParticipant {
  userId: string;
  userName: string;
  status: 'pending' | 'confirmed' | 'declined';
  createdAt: Date;
  updatedAt: Date;
  startTime?: Date;
  endTime?: Date;
}

export type ReservationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export type ReservationVisibility = 'private' | 'public';

export interface PublicReservationDetails {
  freeSeatsText?: string;
}

export interface BoatReservation {
  id: string;
  boatId: string;
  userId: string;
  userName: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  visibility: ReservationVisibility;
  publicDetails?: PublicReservationDetails;
  eligibilitySnapshot?: {
    feesPaid: boolean;
    skipHours: boolean;
    workHoursMet: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicBoatReservation {
  id: string;
  boatId: string;
  boatName: string;
  title: string;
  startTime: Date;
  endTime: Date;
  visibility: ReservationVisibility;
  reservationStatus: Exclude<ReservationStatus, 'rejected' | 'cancelled'>;
  freeSeatsText?: string;
  updatedAt: Date;
}

export interface SystemConfig {
  id: string;
  yearChangeDate: Date; // Stored with year 2000, only month and day are relevant
  workHourThreshold: number;
  featureFlags?: {
    enableMemberCreation?: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}
