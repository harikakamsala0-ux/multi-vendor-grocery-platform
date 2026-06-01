import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Package, Users, TrendingUp } from 'lucide-react';
import { categories } from '@/data/mockData';
import heroBanner from '@/assets/hero-banner.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { RecommendationsSection } from '@/components/RecommendationsSection';

const Home = () => {
  const { user } = useAuth();
  const features = [
    {
      icon: ShoppingBag,
      title: 'Wide Selection',
      description: 'Browse thousands of products from trusted vendors',
    },
    {
      icon: Package,
      title: 'Fast Delivery',
      description: 'Get your orders delivered quickly and safely',
    },
    {
      icon: Users,
      title: 'Trusted Vendors',
      description: 'Shop from verified and reliable sellers',
    },
    {
      icon: TrendingUp,
      title: 'Best Prices',
      description: 'Competitive pricing on all products',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBanner})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        </div>
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Fresh Products
              <br />
              <span className="text-5xl md:text-6xl font-bold leading-tight">
                Delivered Daily
              </span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Shop from multiple vendors and get the best quality products delivered to your doorstep
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button variant="hero" size="xl">
                  Shop Now
                </Button>
              </Link>
              <Link to="/categories">
                <Button variant="outline" size="xl">
                  Browse Categories
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {user?.role === 'customer' ? (
        <RecommendationsSection userId={user.id} title="Picked for you" limit={8} />
      ) : null}

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose FreshCart?</h2>
            <p className="text-muted-foreground text-lg">
              Your trusted marketplace for quality products
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="shadow-card hover:shadow-card-hover transition-base">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Shop by Category</h2>
            <p className="text-muted-foreground text-lg">
              Find exactly what you're looking for
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link key={category.id} to={`/products?category=${encodeURIComponent(category.name)}`}>
                <Card className="shadow-card hover:shadow-card-hover transition-base cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="text-5xl">{category.icon}</div>
                      <div>
                        <h3 className="text-xl font-semibold group-hover:text-primary transition-base">
                          {category.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Shopping?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of happy customers and experience the best online shopping
          </p>
          <Link to="/products">
            <Button variant="secondary" size="xl">
              Explore Products
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
