import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expiredReservations = await prisma.reservation.findMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
    });

    if (expiredReservations.length === 0) {
      return NextResponse.json({ released: 0 });
    }

    let released = 0;
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
        released++;
      }
    });

    console.log(`Cron: released ${released} expired reservations`);
    return NextResponse.json({ released });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}