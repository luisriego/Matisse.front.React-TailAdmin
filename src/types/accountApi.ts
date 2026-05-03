export interface Account {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  balance: number;
}

export interface AccountsApiResponse {
  accounts: Account[];
  qtd: number;
}
