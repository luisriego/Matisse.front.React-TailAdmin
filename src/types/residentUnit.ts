export interface Recipient {
  name: string;
  email: string;
}

// This interface defines the full data structure for a Resident Unit
export interface ResidentUnit {
  id: string;
  unit: string;
  idealFraction: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  notificationRecipients: Recipient[];
}