import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const warehouse1 = await prisma.warehouse.create({
    data: {
      name: "Bangalore Warehouse",
      location: "Bangalore",
    },
  });

  const warehouse2 = await prisma.warehouse.create({
    data: {
      name: "Mumbai Warehouse",
      location: "Mumbai",
    },
  });

  const product1 = await prisma.product.create({
    data: {
      name: "iPhone 15",
      description: "Apple smartphone",
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: "MacBook Air",
      description: "Apple laptop",
    },
  });

  await prisma.inventory.createMany({
    data: [
      {
        productId: product1.id,
        warehouseId: warehouse1.id,
        totalStock: 5,
        reservedStock: 0,
      },
      {
        productId: product1.id,
        warehouseId: warehouse2.id,
        totalStock: 3,
        reservedStock: 0,
      },
      {
        productId: product2.id,
        warehouseId: warehouse1.id,
        totalStock: 2,
        reservedStock: 0,
      },
    ],
  });

  console.log("Database reset complete");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });