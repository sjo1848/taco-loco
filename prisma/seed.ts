import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/modules/auth/crypto";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "change-me-in-development";
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email } });
  const admin = existingAdmin ?? await prisma.adminUser.create({ data: { email, passwordHash: await hashPassword(password) } });
  if (existingAdmin && !existingAdmin.passwordHash.startsWith("scrypt$")) await prisma.adminUser.update({ where: { id: existingAdmin.id }, data: { passwordHash: await hashPassword(password) } });
  await prisma.menuSettings.upsert({ where: { id: "00000000-0000-0000-0000-000000000001" }, update: { businessName: "Taco Loco", whatsappPhone: "5492615956912", whatsappMessage: "Hola Taco Loco, quiero hacer un pedido.", acceptingOrders: true, statusMessage: null }, create: { id: "00000000-0000-0000-0000-000000000001", businessName: "Taco Loco", whatsappPhone: "5492615956912", whatsappMessage: "Hola Taco Loco, quiero hacer un pedido.", currency: "ARS", acceptingOrders: true, weeklySchedule: [] } });
  const categoryNames = ["Tacos", "Nachos", "Quesadillas", "Pizzas", "Más delicias", "Bebidas", "Tragos"];
  const categories = new Map<string, string>();
  for (const [sortOrder, name] of categoryNames.entries()) {
    const category = await prisma.category.upsert({ where: { slug: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-") }, update: { name, sortOrder, active: true, archivedAt: null }, create: { name, slug: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-"), sortOrder } });
    categories.set(name, category.id);
  }
  const canonicalSlugs = categoryNames.map((name) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-"));
  await prisma.category.updateMany({ where: { slug: { notIn: canonicalSlugs } }, data: { active: false, archivedAt: new Date() } });

  const products = [
    ["Tacos", "Taco x2 común", "Queso, carne a elección, lechuga, tomate + 1 salsa a elección.", 10000],
    ["Tacos", "Taco especial x2", "Queso, carne a elección, lechuga, tomate, porotos, zanahoria y repollo.", 12000],
    ["Tacos", "Burrito", "Queso, carne, poroto, lechuga, tomate, zanahoria y choclo.", 10000],
    ["Tacos", "Chimichanga", "Queso, carne mechada y verdeo.", 10000],
    ["Nachos", "Nachos cheddar", "Nachos con cheddar.", 10000],
    ["Nachos", "Nachos especial", "Nachos, queso, carne y criolla.", 13000],
    ["Nachos", "Nachos Picossos", "Nachos, queso cheddar y salsa picante.", 10000],
    ["Quesadillas", "Quesadillas x4", "Queso, carne y verdeo.", 13000],
    ["Quesadillas", "Quesadillas especial x4", "Queso, cheddar, carne, verdeo y panceta.", 15000],
    ["Pizzas", "Muzza", "Queso mozzarella, aceitunas y orégano.", 11000],
    ["Pizzas", "Cantimpalo", "Queso mozzarella, salsa de tomate y cantimpalo.", 14000],
    ["Pizzas", "Picosa", "Queso mozzarella, picante, nachos y aceitunas.", 13000],
    ["Pizzas", "Salchipizza", "Queso mozzarella, salchichas asadas, cheddar y aceitunas.", 15000],
    ["Pizzas", "Pepperoni Premium", "Queso mozzarella, salsa, pepperoni premium, orégano y aceitunas.", 14000],
    ["Pizzas", "Uspallatina", "Queso mozzarella, cheddar, panceta y 1 salsa a elección.", 15000],
    ["Pizzas", "Taco Loco", "Queso mozzarella, carne mechada, choclo, nachos y aceitunas.", 17000],
    ["Pizzas", "Anchopizza", "Queso mozzarella, anchoas, morrón, aceitunas y orégano.", 13000],
    ["Más delicias", "Elote ¡Choclo!", "Choclo bañado en mayonesa, queso y picante especial.", 4000],
    ["Más delicias", "Gordita mexicana", "Pan de papa, carne mechada, lechuga, tomate, queso gratinado y 1 salsa a elección.", 12000],
    ["Bebidas", "Gaseosa 1,5 L", null, 5000], ["Bebidas", "Gaseosa 500 ml", null, 3000], ["Bebidas", "Agua saborizada 1,5 L", null, 3500], ["Bebidas", "Energizante", null, 4000], ["Bebidas", "Latón cerveza 710 ml", null, 4000], ["Bebidas", "Corona 710 ml", null, 7000],
    ["Tragos", "Mojito", null, 7000], ["Tragos", "Mojito Coconut", null, 7000], ["Tragos", "Daikiri", null, 7000], ["Tragos", "Taco Loco", "Gatorade, coconut, Sprite y vodka.", 7000], ["Tragos", "Fernet", null, 7000], ["Tragos", "Gancia", null, 7000],
  ] as const;
  for (const [sortOrder, [categoryName, name, description, priceAmount]] of products.entries()) {
    const categoryId = categories.get(categoryName);
    if (!categoryId) throw new Error(`Missing category ${categoryName}`);
    await prisma.product.upsert({ where: { id: `00000000-0000-0000-0000-${String(sortOrder + 2).padStart(12, "0")}` }, update: { categoryId, name, description, priceAmount, sortOrder, published: true }, create: { id: `00000000-0000-0000-0000-${String(sortOrder + 2).padStart(12, "0")}`, categoryId, name, description, priceAmount, sortOrder } });
  }

  const modifierDefinitions = [
    { name: "Salsa a elección", options: ["Guacamole", "Cheddar", "Criolla", "Picante", "Roquefort"] },
    { name: "Carne a elección", options: [] },
    { name: "Sabor de daikiri", options: ["Mango", "Durazno", "Frutilla"] },
  ];
  for (const [sortOrder, definition] of modifierDefinitions.entries()) {
    const group = await prisma.modifierGroup.findFirst({ where: { name: definition.name } }) ?? await prisma.modifierGroup.create({ data: { name: definition.name, sortOrder } });
    for (const [optionOrder, name] of definition.options.entries()) {
      const exists = await prisma.modifierOption.findFirst({ where: { groupId: group.id, name } });
      if (!exists) await prisma.modifierOption.create({ data: { groupId: group.id, name, sortOrder: optionOrder } });
    }
  }

  const salsa = await prisma.modifierGroup.findFirstOrThrow({ where: { name: "Salsa a elección" } });
  const daikiri = await prisma.modifierGroup.findFirstOrThrow({ where: { name: "Sabor de daikiri" } });
  const selectableModifiers = [
    { product: "Taco x2 común", groupId: salsa.id },
    { product: "Uspallatina", groupId: salsa.id },
    { product: "Gordita mexicana", groupId: salsa.id },
    { product: "Daikiri", groupId: daikiri.id },
  ];
  for (const association of selectableModifiers) {
    const product = await prisma.product.findFirstOrThrow({ where: { name: association.product, archivedAt: null } });
    await prisma.productModifierGroup.upsert({
      where: { productId_modifierGroupId: { productId: product.id, modifierGroupId: association.groupId } },
      update: { required: true, minSelections: 1, maxSelections: 1 },
      create: { productId: product.id, modifierGroupId: association.groupId, required: true, minSelections: 1, maxSelections: 1 },
    });
  }

  const sampleOrder = await prisma.order.findFirst({ where: { notes: "Pedido de demostración C8" } });
  if (!sampleOrder) {
    const taco = await prisma.product.findFirstOrThrow({ where: { name: "Taco x2 común", archivedAt: null } });
    const order = await prisma.order.create({
      data: {
        status: "RECEIVED",
        fulfillment: "PICKUP",
        customerName: "Cliente demo",
        customerPhone: "2615956912",
        notes: "Pedido de demostración C8",
        subtotalAmount: taco.priceAmount,
        totalAmount: taco.priceAmount,
        createdById: admin.id,
        lines: { create: [{ productId: taco.id, productName: taco.name, unitPriceAmount: taco.priceAmount, quantity: 1, modifiersSnapshot: [] }] },
      },
    });
    await prisma.orderEvent.create({ data: { orderId: order.id, toStatus: "RECEIVED", actorId: admin.id, reason: "Pedido inicial de demostración" } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
