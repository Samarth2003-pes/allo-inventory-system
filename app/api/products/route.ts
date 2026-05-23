import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Lazy cleanup — release any expired reservations before showing stock
    const expiredReservations = await prisma.reservation.findMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
    });

    if (expiredReservations.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const res of expiredReservations) {
          await tx.inventory.updateMany({
            where: { productId: res.productId, warehouseId: res.warehouseId },
            data: { reservedStock: { decrement: res.quantity } },
          });
          await tx.reservation.update({
            where: { id: res.id },
            data: { status: "RELEASED" },
          });
        }
      });
    }

    const products = await prisma.product.findMany({
      include: { inventories: { include: { warehouse: true } } },
      orderBy: { name: "asc" },
    });

    const formatted = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      inventory: product.inventories.map((inv) => ({
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        warehouseLocation: inv.warehouse.location,
        totalStock: inv.totalStock,
        reservedStock: inv.reservedStock,
        availableStock: inv.totalStock - inv.reservedStock,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}