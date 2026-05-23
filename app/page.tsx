"use client";

import { useEffect, useState } from "react";

type Inventory = {
  warehouseId: string;
  warehouseName: string;
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

export default function HomePage() {

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProducts() {

    const res = await fetch("/api/products");
    const data = await res.json();

    setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function reserveProduct(
    productId: string,
    warehouseId: string
  ) {

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        warehouseId,
        quantity: 1,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    window.location.href = `/reservations/${data.id}`;
  }

  if (loading) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Inventory System
      </h1>

      <div className="grid gap-6">

        {products.map((product) => (

          <div
            key={product.id}
            className="border p-5 rounded-lg"
          >

            <h2 className="text-2xl font-semibold">
              {product.name}
            </h2>

            <p className="mb-4 text-gray-600">
              {product.description}
            </p>

            {product.inventory.map((inv) => (

              <div
                key={inv.warehouseId}
                className="mb-3"
              >

                <p>
                  Warehouse:
                  {" "}
                  {inv.warehouseName}
                </p>

                <p>
                  Available Stock:
                  {" "}
                  {inv.availableStock}
                </p>

                <button
                  onClick={() =>
                    reserveProduct(
                      product.id,
                      inv.warehouseId
                    )
                  }
                  className="bg-black text-white px-4 py-2 rounded mt-2"
                >
                  Reserve
                </button>

              </div>

            ))}

          </div>

        ))}

      </div>

    </div>
  );
}