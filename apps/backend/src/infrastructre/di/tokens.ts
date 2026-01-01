export const TOKENS = {
  Db: Symbol.for('Db'),
  CategoryRepository: Symbol.for('CategoryRepository'),
  TransactionRepository: Symbol.for('TransactionRepository'),
  CreateCategoryUseCase: Symbol.for('CreateCategoryUseCase'),
  ListCategoriesUseCase: Symbol.for('ListCategoriesUseCase'),
  GetCategoryUseCase: Symbol.for('GetCategoryUseCase'),
  UpdateCategoryUseCase: Symbol.for('UpdateCategoryUseCase'),
  CreateTransactionUseCase: Symbol.for('CreateTransactionUseCase'),
} as const;
