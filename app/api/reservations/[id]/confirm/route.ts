import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await context.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Reservation already processed" },
        { status: 400 }
      );
    }

    if (new Date() > reservation.expiresAt) {
      return NextResponse.json(
        { error: "Reservation expired" },
        { status: 410 }
      );
    }

    const inventory = await prisma.inventory.findFirst({
      where: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
      },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory not found" },
        { status: 404 }
      );
    }

    await prisma.inventory.update({
      where: {
        id: inventory.id,
      },
      data: {
        totalStock: {
          decrement: reservation.quantity,
        },
        reservedStock: {
          decrement: reservation.quantity,
        },
      },
    });

    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: "CONFIRMED",
      },
    });

    return NextResponse.json(updatedReservation);

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { error: "Confirmation failed" },
      { status: 500 }
    );
  }
}