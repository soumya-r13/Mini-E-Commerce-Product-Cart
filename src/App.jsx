import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};
const ProductCard = React.memo(({ product, addToCart }) => {
  const isOutOfStock = product.stock === 0;

  return (
    <div className="card">
      <img src={product.thumbnail} alt={product.title} loading="lazy" />
      <div>
        <h4>{product.title}</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="badge">{product.category}</span>
          <span className={isOutOfStock ? "badge" : ""} style={{color: isOutOfStock ? 'red' : 'green', fontSize: '0.8rem'}}>
            {isOutOfStock ? 'Out of Stock' : 'In Stock'}
          </span>
        </div>
        <p className="price">${product.price}</p>
      </div>
      <button 
        onClick={() => addToCart(product)} 
        disabled={isOutOfStock}
      >
        {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
      </button>
    </div>
  );
});

const Cart = ({ cartItems, updateQuantity, total }) => {
  if (cartItems.length === 0) {
    return (
      <div className="cart-panel">
        <h3>Your Cart</h3>
        <p style={{ color: '#888' }}>Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="cart-panel">
      <h3>Your Cart ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} items)</h3>
      
      {cartItems.map((item) => (
        <div key={item.id} className="cart-item">
          <div style={{ flex: 1 }}>
            <div>{item.title}</div>
            <small>${item.price} x {item.quantity}</small>
          </div>
          <div className="cart-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <button onClick={() => updateQuantity(item.id, -1)}>-</button>
            <span>{item.quantity}</span>
            <button 
              onClick={() => updateQuantity(item.id, 1)}
              disabled={item.quantity >= item.stock}
            >+</button>
          </div>
        </div>
      ))}
      
      <div className="total">Total: ${total.toFixed(2)}</div>
    </div>
  );
};
function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('ecommerce-cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300); 
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortOrder, setSortOrder] = useState(''); 
  useEffect(() => {
    fetch('https://dummyjson.com/products?limit=21')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products);
        const cats = [...new Set(data.products.map(p => p.category))];
        setCategories(cats);
        setIsLoading(false);
      });
  }, []);
  useEffect(() => {
    localStorage.setItem('ecommerce-cart', JSON.stringify(cart));
  }, [cart]);
  const filteredProducts = useMemo(() => {
    let result = products;

    if (debouncedSearch) {
      result = result.filter(p => 
        p.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (sortOrder) {
      result = [...result].sort((a, b) => {
        return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
      });
    }

    return result;
  }, [products, debouncedSearch, selectedCategory, sortOrder]);
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; 
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);
  const updateQuantity = (id, change) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + change;
          if (newQty < 1) return null; 
          if (newQty > item.stock) return item; 
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean); 
    });
  };
  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSortOrder('');
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  return (
    <div className="container">
      <div className="product-area">
        <header className="header">
          <h2>Mini E-Commerce</h2>
          <div className="controls">
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="">Sort by Price</option>
              <option value="asc">Low to High</option>
              <option value="desc">High to Low</option>
            </select>

            <button className="secondary" onClick={clearFilters} style={{width: 'auto'}}>
              Clear Filters
            </button>
          </div>
        </header>
        {isLoading ? (
          <p>Loading products...</p>
        ) : filteredProducts.length > 0 ? (
          <div className="product-grid">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                addToCart={addToCart} 
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No products found matching your criteria.</p>
          </div>
        )}
      </div>
      <Cart 
        cartItems={cart} 
        updateQuantity={updateQuantity} 
        total={cartTotal} 
      />
    </div>
  );
}
export default App;