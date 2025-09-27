export interface Account {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AccountsApiResponse {
  accounts: Account[];
  qtd: number;
}
