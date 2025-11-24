import { db } from "../db";
import { currencies } from "../schema/currencies";
import { transactionTypes } from "../schema/transaction-types";
import { categories } from "../schema/categories";

const seedCurrencies = async () => {
  console.log("🌱 Seeding currencies...");

  await db.insert(currencies).values([
    {
      code: "JPY",
      name: "日本円",
      symbol: "¥",
      isActive: true,
    },
    {
      code: "USD",
      name: "米ドル",
      symbol: "$",
      isActive: false,
    },
    {
      code: "EUR",
      name: "ユーロ",
      symbol: "€",
      isActive: false,
    },
  ]);

  console.log("✅ Currencies seeded successfully");
};

const seedTransactionTypes = async () => {
  console.log("🌱 Seeding transaction types...");

  const types = await db
    .insert(transactionTypes)
    .values([
      {
        code: "INCOME",
        name: "収入",
      },
      {
        code: "EXPENSE",
        name: "支出",
      },
    ])
    .returning();

  console.log("✅ Transaction types seeded successfully");
  return types;
};

const seedCategories = async (incomeTypeId: number, expenseTypeId: number) => {
  console.log("🌱 Seeding categories...");

  await db.insert(categories).values([
    // 支出カテゴリ
    {
      name: "食費",
      typeId: expenseTypeId,
      isDefault: true,
    },
    {
      name: "交通費",
      typeId: expenseTypeId,
      isDefault: true,
    },
    {
      name: "日用品",
      typeId: expenseTypeId,
      isDefault: true,
    },
    {
      name: "娯楽",
      typeId: expenseTypeId,
      isDefault: true,
    },
    {
      name: "その他",
      typeId: expenseTypeId,
      isDefault: true,
    },
    // 収入カテゴリ
    {
      name: "給与",
      typeId: incomeTypeId,
      isDefault: true,
    },
    {
      name: "副業",
      typeId: incomeTypeId,
      isDefault: true,
    },
    {
      name: "その他",
      typeId: incomeTypeId,
      isDefault: true,
    },
  ]);

  console.log("✅ Categories seeded successfully");
};

const main = async () => {
  console.log("🚀 Starting database seed...");

  try {
    await seedCurrencies();
    const types = await seedTransactionTypes();

    const incomeType = types.find((t) => t.code === "INCOME");
    const expenseType = types.find((t) => t.code === "EXPENSE");

    if (!incomeType || !expenseType) {
      throw new Error("Failed to seed transaction types");
    }

    await seedCategories(incomeType.id, expenseType.id);

    console.log("🎉 All seeds completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
};

main();
