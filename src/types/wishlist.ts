export interface WishlistItem {
  id: string;
  userId: string;
  name: string;
  /** 0 = sem valor definido */
  value: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WishlistFirestore {
  userId: string;
  name: string;
  value: number;
  description?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreateWishlistData {
  name: string;
  /** Opcional; omitido ou 0 = sem valor */
  value?: number;
  description?: string;
}

export interface UpdateWishlistData {
  name?: string;
  value?: number;
  description?: string;
}
