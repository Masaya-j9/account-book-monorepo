import 'reflect-metadata';

import type { NodePgDatabase } from '@account-book-app/db';
import { Container } from 'inversify';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import { CreateCategoryUseCase } from '../../services/categories/create.category.service';
import { GetCategoryUseCase } from '../../services/categories/get-category.service';
import { ListCategoriesUseCase } from '../../services/categories/list-categories.service';
import { UpdateCategoryUseCase } from '../../services/categories/update-category.service';
import { CategoryRepository } from '../repositories/category.repository';
import { TOKENS } from './tokens';

export const createRequestContainer = (db: NodePgDatabase) => {
  const container = new Container({ defaultScope: 'Transient' });

  container.bind<NodePgDatabase>(TOKENS.Db).toConstantValue(db);

  container
    .bind<ICategoryRepository>(TOKENS.CategoryRepository)
    .to(CategoryRepository);

  container
    .bind<CreateCategoryUseCase>(TOKENS.CreateCategoryUseCase)
    .to(CreateCategoryUseCase);

  container
    .bind<ListCategoriesUseCase>(TOKENS.ListCategoriesUseCase)
    .to(ListCategoriesUseCase);

  container
    .bind<GetCategoryUseCase>(TOKENS.GetCategoryUseCase)
    .to(GetCategoryUseCase);

  container
    .bind<UpdateCategoryUseCase>(TOKENS.UpdateCategoryUseCase)
    .to(UpdateCategoryUseCase);

  return container;
};
