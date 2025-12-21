import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const success = await login(email, password);

      if (success) {
        toast.success("Login successful!");

        // Redirect based on role
        if (user?.role === "admin") navigate("/admin/dashboard");
        else if (user?.role === "vendor") navigate("/vendor/dashboard");
        else if (user?.role === "customer") navigate("/customer/dashboard");
        else navigate("/");
      } else {
        setError("Invalid credentials. Please try again.");
        toast.error("Invalid credentials!");
      }
    } catch (err) {
      setError("Something went wrong. Please try again later.");
      toast.error("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-lg p-8 w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Sign In</h2>
        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Email"
            className="mb-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            className="mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <Button type="submit" className="w-full mb-3" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
          <p className="text-sm text-center">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
