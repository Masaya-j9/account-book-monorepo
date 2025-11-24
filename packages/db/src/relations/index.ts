import { relations } from "drizzle-orm";
import { users } from "../schema/users";
import { transactionTypes } from "../schema/transaction-types";
import { categories } from "../schema/categories";
import { userCategories } from "../schema/user-categories";
import { transactions } from "../schema/transactions";
import { transactionCategories } from "../schema/transaction-categories";
import { currencies } from "../schema/currencies";

// users relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  userCategories: many(userCategories),
}));

// transaction_types relations
export const transactionTypesRelations = relations(
  transactionTypes,
  ({ many }) => ({
    categories: many(categories),
    transactions: many(transactions),
  })
);

// categories relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  transactionType: one(transactionTypes, {
    fields: [categories.typeId],
    references: [transactionTypes.id],
  }),
  userCategories: many(userCategories),
  transactionCategories: many(transactionCategories),
}));

// user_categories relations
export const userCategoriesRelations = relations(userCategories, ({ one }) => ({
  user: one(users, {
    fields: [userCategories.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [userCategories.categoryId],
    references: [categories.id],
  }),
}));

// transactions relations
export const transactionsRelations = relations(
  transactions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [transactions.userId],
      references: [users.id],
    }),
    transactionType: one(transactionTypes, {
      fields: [transactions.typeId],
      references: [transactionTypes.id],
    }),
    currency: one(currencies, {
      fields: [transactions.currencyId],
      references: [currencies.id],
    }),
    transactionCategories: many(transactionCategories),
  })
);

// transaction_categories relations
export const transactionCategoriesRelations = relations(
  transactionCategories,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionCategories.transactionId],
      references: [transactions.id],
    }),
    category: one(categories, {
      fields: [transactionCategories.categoryId],
      references: [categories.id],
    }),
  })
);

// currencies relations
export const currenciesRelations = relations(currencies, ({ many }) => ({
  transactions: many(transactions),
}));
