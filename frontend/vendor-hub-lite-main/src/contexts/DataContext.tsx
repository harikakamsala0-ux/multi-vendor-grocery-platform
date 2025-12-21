import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  categories as initialCategories, 
  products as initialProducts, 
  orders as initialOrders,
  Product,
  Order,
  Category
} from '@/data/mockData';

interface DataContextType {
  products: Product[];
  orders: Order[];
  categories: Category[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  placeOrder: (order: Omit<Order, 'id' | 'status'>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = localStorage.getItem('freshcart_products');
    return stored ? JSON.parse(stored) : initialProducts;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const stored = localStorage.getItem('freshcart_orders');
    return stored ? JSON.parse(stored) : initialOrders;
  });

  const [categories] = useState<Category[]>(initialCategories);

  useEffect(() => {
    localStorage.setItem('freshcart_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('freshcart_orders', JSON.stringify(orders));
  }, [orders]);

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  const placeOrder = (order: Omit<Order, 'id' | 'status'>) => {
    const newOrder: Order = {
      ...order,
      id: Date.now().toString(),
      status: 'pending',
    };
    setOrders(prev => [...prev, newOrder]);
  };

  return (
    <DataContext.Provider
      value={{
        products,
        orders,
        categories,
        addProduct,
        updateOrderStatus,
        placeOrder,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
