import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { categoryOptions } from '@/data/categoriesList';

const Categories = () => {
  const [products, setProducts] = useState<any[]>([]);

  // Fetch all products from backend
  const fetchProducts = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/products/");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.log("Failed to fetch products");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getCategoryProductCount = (categoryName: string) => {
    return products.filter((p) => p.category === categoryName).length;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Product Categories</h1>
          <p className="text-muted-foreground text-lg">
            Explore our wide range of product categories
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryOptions.map((category) => {
            const productCount = getCategoryProductCount(category.name);

            return (
              <Card
                key={category.id}
                className="shadow-card hover:shadow-card-hover transition-base group"
              >
                <CardHeader>
                  <div className="text-6xl mb-4">{category.icon}</div>
                  <CardTitle className="text-2xl group-hover:text-primary transition-base">
                    {category.name}
                  </CardTitle>
                  <CardDescription className="text-base">{category.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {productCount} {productCount === 1 ? "product" : "products"}
                    </span>

                    <Link to={`/products?category=${category.name}`}>
                      <Button variant="ghost" size="sm">
                        Browse
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Categories;
