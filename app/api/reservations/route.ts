import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reservationSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().min(1),
});

type InventoryRow = {
  id: string;
  totalStock: number;
  reservedStock: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = reservationSchema.parse(body);

    const reservation = await prisma.$transaction(async (tx) => {
      const inventories = await tx.$queryRaw`
        SELECT id, "totalStock", "reservedStock"
        FROM "Inventory"
        WHERE "productId" = ${validatedData.productId}
          AND "warehouseId" = ${validatedData.warehouseId}
        FOR UPDATE
      ` as InventoryRow[];

      if (inventories.length === 0) {
        throw new Error("INVENTORY_NOT_FOUND");
      }

      const inventory = inventories[0];
      const availableStock = inventory.totalStock - inventory.reservedStock;

      if (availableStock < validatedData.quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      await tx.inventory.update({
        where: { id: inventory.id },
        data: { reservedStock: { increment: validatedData.quantity } },
      });

      const newReservation = await tx.reservation.create({
        data: {
          productId: validatedData.productId,
          warehouseId: validatedData.warehouseId,
          quantity: validatedData.quantity,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
        include: { product: true, warehouse: true },
      });

      return newReservation;
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVENTORY_NOT_FOUND") {
        return NextResponse.json(
          { error: "Inventory not found for this product and warehouse" },
          { status: 404 }
        );
      }
      if (error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { error: "Not enough stock available" },
          { status: 409 }
        );
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Reservation error:", error);
    return NextResponse.json(
      { error: "Reservation failed. Please try again." },
      { status: 500 }
    );
  }
}