export interface InstallmentPurchase {
  id: string;
  userId: string;
  title: string;
  purchaseDate: Date;
  totalAmount: number;
  installmentAmount: number;
  cardId: string;
  installmentsCount: number;
  remainingInstallments: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInstallmentPurchaseInput {
  title: string;
  purchaseDate: Date;
  totalAmount: number;
  installmentAmount: number;
  cardId: string;
  installmentsCount: number;
}