export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  vendorId: string;
  vendorName: string;
  image: string;
  stock: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'rejected';
  date: string;
  vendorId: string;
}

export interface VendorUser {
  id: string;
  name: string;
  email: string;
  role: 'vendor';
  status: 'active' | 'pending' | 'inactive';
  joinDate: string;
}

export const categories: Category[] = [
  { id: '1', name: 'Fresh Vegetables', description: 'Farm-fresh organic vegetables', icon: '🥬' },
  { id: '2', name: 'Fresh Fruits', description: 'Seasonal fruits delivered daily', icon: '🍎' },
  { id: '3', name: 'Dairy Products', description: 'Fresh milk, cheese, and yogurt', icon: '🥛' },
  { id: '4', name: 'Bakery', description: 'Freshly baked bread and pastries', icon: '🍞' },
  { id: '5', name: 'Meat & Seafood', description: 'Premium quality meat and seafood', icon: '🥩' },
  { id: '6', name: 'Beverages', description: 'Juices, soft drinks, and more', icon: '🥤' },
];

export const products: Product[] = [
  {
    id: '1',
    name: 'Organic Tomatoes',
    description: 'Fresh organic tomatoes from local farms',
    price: 4.99,
    categoryId: '1',
    vendorId: '2',
    vendorName: 'Vendor Shop',
    image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337',
    stock: 50,
  },
  {
    id: '2',
    name: 'Fresh Bananas',
    description: 'Ripe bananas perfect for smoothies',
    price: 2.99,
    categoryId: '2',
    vendorId: '2',
    vendorName: 'Vendor Shop',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e',
    stock: 100,
  },
  {
    id: '3',
    name: 'Whole Milk',
    description: 'Fresh whole milk from grass-fed cows',
    price: 5.49,
    categoryId: '3',
    vendorId: '2',
    vendorName: 'Vendor Shop',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b',
    stock: 30,
  },
  {
    id: '4',
    name: 'Sourdough Bread',
    description: 'Artisan sourdough bread baked fresh daily',
    price: 6.99,
    categoryId: '4',
    vendorId: '2',
    vendorName: 'Vendor Shop',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
    stock: 20,
  },
  {
    id: '5',
    name: 'Fresh Salmon',
    description: 'Wild-caught Atlantic salmon',
    price: 15.99,
    categoryId: '5',
    vendorId: '2',
    vendorName: 'Vendor Shop',
    image: 'https://images.unsplash.com/photo-1485704686097-ed47f7263ca4',
    stock: 15,
  },
  {
    id: '6',
    name: 'Orange Juice',
    description: 'Freshly squeezed orange juice',
    price: 4.49,
    categoryId: '6',
    vendorId: '2',
    vendorName: 'Vendor Shop',
    image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba',
    stock: 40,
  },
];

export const orders: Order[] = [
  {
    id: '1',
    customerId: '3',
    customerName: 'John Doe',
    productId: '1',
    productName: 'Organic Tomatoes',
    quantity: 2,
    totalPrice: 9.98,
    status: 'pending',
    date: '2024-01-15',
    vendorId: '2',
  },
  {
    id: '2',
    customerId: '3',
    customerName: 'John Doe',
    productId: '3',
    productName: 'Whole Milk',
    quantity: 1,
    totalPrice: 5.49,
    status: 'approved',
    date: '2024-01-14',
    vendorId: '2',
  },
];

export const vendors: VendorUser[] = [
  {
    id: '2',
    name: 'Vendor Shop',
    email: 'vendor@freshcart.com',
    role: 'vendor',
    status: 'active',
    joinDate: '2024-01-01',
  },
];
