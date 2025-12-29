import { Data } from '../../shared/result';

export class InvalidTypeIdError extends Data.TaggedError('InvalidTypeIdError')<{
  message: string;
}> {}

export class InvalidCategoryNameError extends Data.TaggedError(
  'InvalidCategoryNameError',
)<{
  message: string;
}> {}

export class DuplicateCategoryError extends Data.TaggedError(
  'DuplicateCategoryError',
)<{
  message: string;
  name: string;
}> {}

export class TransactionTypeNotFoundError extends Data.TaggedError(
  'TransactionTypeNotFoundError',
)<{
  message: string;
  typeId: number;
}> {}

export class UnexpectedCreateCategoryError extends Data.TaggedError(
  'UnexpectedCreateCategoryError',
)<{
  message: string;
  cause: Error;
}> {}

export type CreateCategoryError =
  | InvalidTypeIdError
  | InvalidCategoryNameError
  | DuplicateCategoryError
  | TransactionTypeNotFoundError
  | UnexpectedCreateCategoryError;
