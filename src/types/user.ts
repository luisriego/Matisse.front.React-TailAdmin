export interface NotificationRecipient {
  name: string;
  email: string;
}

export interface ResidentUnit {
  id: string;
  unit: string;
  idealFraction: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  notificationRecipients: NotificationRecipient[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  lastName: string;
  gender: string;
  phoneNumber: string | null;
  roles: string[];
  isActive: boolean;
  createdAt: { date: string; timezone_type: number; timezone: string };
  updatedAt: { date: string; timezone_type: number; timezone: string };
  residentUnit: ResidentUnit | null;
}

export interface DecodedToken {
  id: string;
  name: string;
  user: string; // This is the email
  unit: string;
  roles: string;
}
