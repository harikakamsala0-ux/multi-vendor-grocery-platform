import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "admin" | "vendor" | "customer";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("freshcart_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // ✅ Login
  const login = async (email: string, password: string): Promise<boolean> => {
    // Special admin login
    if (email === "greeshma123@gmail.com" && password === "greeshma123") {
      const adminUser = { id: "0", email, role: "admin" as UserRole, name: "Admin" };
      setUser(adminUser);
      localStorage.setItem("freshcart_user", JSON.stringify(adminUser));
      return true;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      const userData: User = {
        id: data.id,
        email: data.email,
        role: data.role,
        name: data.name,
      };

      setUser(userData);
      localStorage.setItem("freshcart_user", JSON.stringify(userData));
      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  // ✅ Signup
  const signup = async (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ): Promise<boolean> => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      return res.ok;
    } catch (err) {
      console.error("Signup error:", err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("freshcart_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
