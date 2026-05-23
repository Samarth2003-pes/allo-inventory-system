import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type ReservationRow = {
  id: string;
  status: string;
  productId: string;
  warehouseId: string;
  quantity: number;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const result = await prisma.$transaction(async (tx) => {
      const reservations = await tx.$queryRaw`
        SELECT id, status, "productId", "warehouseId", quantity
        FROM "Reservation"
        WHERE id = ${id}
        FOR UPDATE
      ` as ReservationRow[];

      if (reservations.length === 0) throw new Error("NOT_FOUND");

      const reservation = reservations[0];

      if (reservation.status !== "PENDING") throw new Error("ALREADY_PROCESSED");

      await tx.inventory.updateMany({
        where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
        data: { reservedStock: { decrement: reservation.quantity } },
      });

      return await tx.reservation.update({
        where: { id },
        data: { status: "RELEASED" },
        include: { product: true, warehouse: true },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND")
        return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
      if (error.message === "ALREADY_PROCESSED")
        return NextResponse.json({ error: "Reservation has already been confirmed or cancelled" }, { status: 400 });
    }
    console.error("Release error:", error);
    return NextResponse.json({ error: "Release failed. Please try again." }, { status: 500 });
  }
}