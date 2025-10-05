
export interface User {
  id: string;
  email: string;
  name: string;
  lastName: string | null;
  gender: string | null;
  phoneNumber: string | null;
  roles: string[];
  isActive: boolean;
  createdAt: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  updatedAt: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  residentUnit: {
    id: string;
    unit: string;
    idealFraction: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    notificationRecipients: {
      name: string;
      email: string;
    }[];
  } | null;
}
