export interface ShoppingListItem {
  id: string;
  userId: string;
  label: string;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShoppingListItemInput {
  label: string;
}