import { Data } from '../../shared/result';

export class CategoryNotFoundError extends Data.TaggedError(
  'CategoryNotFoundError',
)<{
  message: string;
  categoryId: number;
}> {}

export class DefaultCategoryUpdateForbiddenError extends Data.TaggedError(
  'DefaultCategoryUpdateForbiddenError',
)<{
  message: string;
  categoryId: number;
}> {}

export class InvalidUpdateDataError extends Data.TaggedError(
  'InvalidUpdateDataError',
)<{
  message: string;
}> {}

export class UnexpectedUpdateCategoryError extends Data.TaggedError(
  'UnexpectedUpdateCategoryError',
)<{
  message: string;
  cause: Error;
}> {}

export type UpdateCategoryError =
  | CategoryNotFoundError
  | DefaultCategoryUpdateForbiddenError
  | InvalidUpdateDataError
  | UnexpectedUpdateCategoryError;
