// =====================================
// Transactions Schema Constants
// =====================================

export const TRANSACTION_TITLE_MAX_LENGTH = 100 as const;
export const TRANSACTION_MEMO_MAX_LENGTH = 500 as const;
export const TRANSACTION_CURRENCY_MAX_LENGTH = 10 as const;

export const TRANSACTIONS_LIST_MIN_PAGE = 1 as const;
export const TRANSACTIONS_LIST_DEFAULT_PAGE = 1 as const;

export const TRANSACTIONS_LIST_MIN_LIMIT = 1 as const;
export const TRANSACTIONS_LIST_DEFAULT_LIMIT = 20 as const;
export const TRANSACTIONS_LIST_MAX_LIMIT = 100 as const;

export const TRANSACTIONS_LIST_ORDER_VALUES = ['asc', 'desc'] as const;
export const TRANSACTIONS_LIST_DEFAULT_ORDER = 'desc' as const;

export const TRANSACTION_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
