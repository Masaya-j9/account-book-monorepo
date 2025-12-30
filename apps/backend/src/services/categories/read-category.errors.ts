import { Data } from '../../shared/result';

// =====================================
// List Categories Errors
// =====================================

export class InvalidPaginationError extends Data.TaggedError(
  'InvalidPaginationError',
)<{
  message: string;
}> {}

export class InvalidSortParameterError extends Data.TaggedError(
  'InvalidSortParameterError',
)<{
  message: string;
}> {}

export class UnexpectedListCategoriesError extends Data.TaggedError(
  'UnexpectedListCategoriesError',
)<{
  message: string;
  cause: Error;
}> {}

export type ListCategoriesError =
  | InvalidPaginationError
  | InvalidSortParameterError
  | UnexpectedListCategoriesError;

// =====================================
// Get Category Errors
// =====================================

export class CategoryNotFoundError extends Data.TaggedError(
  'CategoryNotFoundError',
)<{
  message: string;
  categoryId: number;
}> {}

export class CategoryAccessForbiddenError extends Data.TaggedError(
  'CategoryAccessForbiddenError',
)<{
  message: string;
  categoryId: number;
}> {}

export class InvalidCategoryIdError extends Data.TaggedError(
  'InvalidCategoryIdError',
)<{
  message: string;
}> {}

export class UnexpectedGetCategoryError extends Data.TaggedError(
  'UnexpectedGetCategoryError',
)<{
  message: string;
  cause: Error;
}> {}

export type GetCategoryError =
  | CategoryNotFoundError
  | CategoryAccessForbiddenError
  | InvalidCategoryIdError
  | UnexpectedGetCategoryError;
