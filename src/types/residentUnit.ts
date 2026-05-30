export interface Recipient {
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
  notificationRecipients: Recipient[];
}