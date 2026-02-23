import { relations } from "drizzle-orm";
import { categories } from "../schema/categories.js";
import { currencies } from "../schema/currencies.js";
import { tokenBlacklists } from "../schema/token-blacklists.js";
import { transactionCategories } from "../schema/transaction-categories.js";
import { transactionTypes } from "../schema/transaction-types.js";
import { transactions } from "../schema/transactions.js";
import { userCategories } from "../schema/user-categories.js";
import { users } from "../schema/users.js";

// users relations
export const usersRelations = relations(users, ({ many }) => ({
	transactions: many(transactions),
	userCategories: many(userCategories),
	tokenBlacklists: many(tokenBlacklists),
}));

// transaction_types relations
export const transactionTypesRelations = relations(
	transactionTypes,
	({ many }) => ({
		categories: many(categories),
		transactions: many(transactions),
	}),
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
	}),
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
	}),
);

// currencies relations
export const currenciesRelations = relations(currencies, ({ many }) => ({
	transactions: many(transactions),
}));

// token_blacklists relations
export const tokenBlacklistsRelations = relations(
	tokenBlacklists,
	({ one }) => ({
		user: one(users, {
			fields: [tokenBlacklists.userId],
			references: [users.id],
		}),
	}),
);
