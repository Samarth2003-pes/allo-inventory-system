"use client";

import { useEffect, useState } from "react";

type Inventory = {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  inventory: Inventory[];
};

function StockBadge({ available }: { available: number }) {
  if (available === 0)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Out of stock</span>;
  if (available <= 2)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Only {available} left</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{available} available</span>;
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function fetchProducts() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => { fetchProducts(); }, []);

  async function reserveProduct(productId: string, warehouseId: string) {
    const key = `${productId}-${warehouseId}`;
    setReserving(key);
    setErrors((prev) => ({ ...prev, [key]: "" }));

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
    });

    const data = await res.json();
    setReserving(null);

    if (!res.ok) {
      setErrors((prev) => ({ ...prev, [key]: data.error }));
      fetchProducts();
      return;
    }

    window.location.href = `/reservations/${data.id}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">Allo Store</span>
          </div>
          <span className="text-sm text-gray-500">Inventory System</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Reserve a product to hold it for 10 minutes while you check out.
          </p>
        </div>

        <div className="grid gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Product header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {product.name.toLowerCase().includes("iphone") ? "📱" :
                   product.name.toLowerCase().includes("macbook") ? "💻" :
                   product.name.toLowerCase().includes("ipad") ? "📲" : "📦"}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
                  <p className="text-gray-400 text-sm">{product.description}</p>
                </div>
              </div>

              {/* Warehouse rows */}
              <div className="divide-y divide-gray-50">
                {product.inventory.map((inv) => {
                  const key = `${product.id}-${inv.warehouseId}`;
                  const isReserving = reserving === key;
                  const errorMsg = errors[key];
                  const outOfStock = inv.availableStock === 0;

                  return (
                    <div key={inv.warehouseId} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-sm">
                          🏭
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{inv.warehouseName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StockBadge available={inv.availableStock} />
                            {inv.reservedStock > 0 && (
                              <span className="text-xs text-orange-400">{inv.reservedStock} reserved</span>
                            )}
                          </div>
                          {errorMsg && (
                            <p className="text-xs text-red-600 mt-1 font-medium">⚠ {errorMsg}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => reserveProduct(product.id, inv.warehouseId)}
                        disabled={outOfStock || isReserving}
                        className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                          outOfStock
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : isReserving
                            ? "bg-gray-800 text-white opacity-60 cursor-wait"
                            : "bg-gray-900 text-white hover:bg-gray-700 active:scale-95"
                        }`}
                      >
                        {isReserving ? "Reserving..." : "Reserve →"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Reservations expire after 10 minutes if not confirmed.
        </p>
      </div>
    </div>
  );
}