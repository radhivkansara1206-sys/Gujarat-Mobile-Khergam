export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  _count?: { items: number };
  items?: Item[];
}

export interface Item {
  id: string;
  categoryId: string;
  name: string;
  brand: string;
  model: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
}

export interface Sale {
  id: string;
  itemId: string;
  userId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentType: 'cash' | 'online';
  referenceNumber: string | null;
  notes: string | null;
  createdAt: Date;
  item?: Item;
  user?: User;
}

export interface Gift {
  id: string;
  itemId: string;
  userId: string;
  quantity: number;
  recipientName: string | null;
  reason: string | null;
  createdAt: Date;
  item?: Item;
  user?: User;
}

export interface DashboardStats {
  totalItems: number;
  totalStock: number;
  totalValue: number;
  todaySalesCash: number;
  todaySalesOnline: number;
  todaySalesTotal: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface LowStockItem extends Item {
  category: Category;
}
