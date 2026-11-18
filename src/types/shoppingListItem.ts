export interface ShoppingListItem {
  id: string;
  userId: string;
  label: string;
  /** 0 = sem valor definido */
  value: number;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShoppingListItemInput {
  label: string;
  /** Opcional; omitido ou 0 = sem valor */
  value?: number;
}
