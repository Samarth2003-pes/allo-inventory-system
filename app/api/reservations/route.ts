import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reservationSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validatedData = reservationSchema.parse(body);

    const inventory = await prisma.inventory.findFirst({
      where: {
        productId: validatedData.productId,
        warehouseId: validatedData.warehouseId,
      },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory not found" },
        { status: 404 }
      );
    }

    const availableStock =
      inventory.totalStock - inventory.reservedStock;

    if (availableStock < validatedData.quantity) {
      return NextResponse.json(
        { error: "Not enough stock available" },
        { status: 409 }
      );
    }

    await prisma.inventory.update({
      where: {
        id: inventory.id,
      },
      data: {
        reservedStock: {
          increment: validatedData.quantity,
        },
      },
    });

    const reservation = await prisma.reservation.create({
      data: {
        productId: validatedData.productId,
        warehouseId: validatedData.warehouseId,
        quantity: validatedData.quantity,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return NextResponse.json(reservation);

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Reservation failed" },
      { status: 500 }
    );
  }
}
