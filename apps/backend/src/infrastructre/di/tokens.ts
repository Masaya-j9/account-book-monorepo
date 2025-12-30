export const TOKENS = {
  Db: Symbol.for('Db'),
  CategoryRepository: Symbol.for('CategoryRepository'),
  CreateCategoryUseCase: Symbol.for('CreateCategoryUseCase'),
  ListCategoriesUseCase: Symbol.for('ListCategoriesUseCase'),
  GetCategoryUseCase: Symbol.for('GetCategoryUseCase'),
} as const;
