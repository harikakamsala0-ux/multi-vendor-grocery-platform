import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { ShoppingCart, Heart, LayoutDashboard, LogOut, Search, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const { products: wishlistItems } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (location.pathname !== '/products') return;
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('search') ?? '');
  }, [location.pathname, location.search]);

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    const base =
      location.pathname === '/products'
        ? new URLSearchParams(location.search)
        : new URLSearchParams();
    if (!q) {
      base.delete('search');
      const s = base.toString();
      navigate(s ? `/products?${s}` : '/products');
      return;
    }
    base.set('search', q);
    navigate(`/products?${base.toString()}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'vendor':
        return '/vendor/dashboard';
      case 'customer':
        return '/customer/dashboard';
      default:
        return '/';
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-auto min-h-16 flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:py-0">
          <div className="flex w-full min-w-0 flex-1 items-center gap-3 md:min-w-0">
            <Link to="/" className="flex shrink-0 items-center space-x-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <span>FreshCart</span>
            </Link>

            <form
              onSubmit={onSearchSubmit}
              className="relative flex min-w-0 flex-1 md:max-w-md lg:max-w-xl"
              role="search"
              aria-label="Search products"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products by name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full pl-9 pr-3"
              />
            </form>
          </div>

          <div className="hidden md:flex items-center space-x-6 shrink-0">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-base">
              Home
            </Link>
            <Link to="/products" className="text-sm font-medium hover:text-primary transition-base">
              Products
            </Link>
            <Link to="/categories" className="text-sm font-medium hover:text-primary transition-base">
              Categories
            </Link>
          </div>

          <div className="flex items-center justify-end space-x-2 sm:space-x-4 shrink-0">
            <Link
              to="/cart"
              className="relative inline-flex rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted/80"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 ? (
                <Badge
                  className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-[10px] p-0"
                  variant="default"
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </Badge>
              ) : null}
            </Link>
            <Link
              to="/wishlist"
              className="relative inline-flex rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted/80"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistItems.length > 0 ? (
                <Badge
                  className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-[10px] p-0"
                  variant="secondary"
                >
                  {wishlistItems.length > 99 ? "99+" : wishlistItems.length}
                </Badge>
              ) : null}
            </Link>
            {isAuthenticated ? (
              <>
                <Link to={getDashboardPath()}>
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-primary capitalize">{user.role}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/login">
                <Button variant="default" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-6 border-t border-border/60 py-2 text-xs font-medium text-muted-foreground md:hidden">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <Link to="/products" className="hover:text-primary">
            Products
          </Link>
          <Link to="/categories" className="hover:text-primary">
            Categories
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
