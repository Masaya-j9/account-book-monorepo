import 'reflect-metadata';

import type { NodePgDatabase } from '@account-book-app/db';
import { Container } from 'inversify';
import type { ICategoryRepository } from '../../domain/repositories/category.repository.interface';
import type { ITokenBlacklistRepository } from '../../domain/repositories/token-blacklist.repository.interface';
import type { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { CreateJwtService } from '../../services/auth/create-jwt.service';
import { CreateCategoryUseCase } from '../../services/categories/create.category.service';
import { GetCategoryUseCase } from '../../services/categories/get-category.service';
import { ListCategoriesUseCase } from '../../services/categories/list-categories.service';
import { UpdateCategoryUseCase } from '../../services/categories/update-category.service';
import { TOKENS } from '../../services/di/tokens';
import { CreateTransactionUseCase } from '../../services/transactions/create-transaction.service';
import { DeleteTransactionUseCase } from '../../services/transactions/delete-transaction.service';
import { ListTransactionsUseCase } from '../../services/transactions/list-transactions.service';
import { UpdateTransactionUseCase } from '../../services/transactions/update-transaction.service';
import { LoginUserUseCase } from '../../services/users/login-user.service';
import { LogoutUserUseCase } from '../../services/users/logout-user.service';
import { RegisterUserUseCase } from '../../services/users/register-user.service';
import { CreateJwtProvider } from '../auth/jwt';
import { CategoryRepository } from '../repositories/category.repository';
import { TokenBlacklistRepository } from '../repositories/token-blacklist.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { UserRepository } from '../repositories/user.repository';

export const createRequestContainer = (db: NodePgDatabase) => {
  const container = new Container({ defaultScope: 'Transient' });

  container.bind<NodePgDatabase>(TOKENS.Db).toConstantValue(db);

  container
    .bind<ICategoryRepository>(TOKENS.CategoryRepository)
    .to(CategoryRepository);

  container
    .bind<ITransactionRepository>(TOKENS.TransactionRepository)
    .to(TransactionRepository);

  container.bind<IUserRepository>(TOKENS.UserRepository).to(UserRepository);

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

  container
    .bind<CreateTransactionUseCase>(TOKENS.CreateTransactionUseCase)
    .to(CreateTransactionUseCase);

  container
    .bind<ListTransactionsUseCase>(TOKENS.ListTransactionsUseCase)
    .to(ListTransactionsUseCase);

  container
    .bind<UpdateTransactionUseCase>(TOKENS.UpdateTransactionUseCase)
    .to(UpdateTransactionUseCase);

  container
    .bind<DeleteTransactionUseCase>(TOKENS.DeleteTransactionUseCase)
    .to(DeleteTransactionUseCase);

  container
    .bind<RegisterUserUseCase>(TOKENS.RegisterUserUseCase)
    .to(RegisterUserUseCase);

  container
    .bind<LoginUserUseCase>(TOKENS.LoginUserUseCase)
    .to(LoginUserUseCase);

  container
    .bind<LogoutUserUseCase>(TOKENS.LogoutUserUseCase)
    .to(LogoutUserUseCase);

  container
    .bind<ITokenBlacklistRepository>(TOKENS.TokenBlacklistRepository)
    .to(TokenBlacklistRepository);

  container
    .bind<CreateJwtProvider>(TOKENS.CreateJwtTokenProvider)
    .to(CreateJwtProvider);

  container
    .bind<CreateJwtService>(TOKENS.CreateJwtService)
    .to(CreateJwtService);

  return container;
};
