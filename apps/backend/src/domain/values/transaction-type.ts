// Value Object: TransactionType
// 取引タイプ(収入/支出)を表現

export class TransactionTypeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionTypeValidationError';
  }
}

export class TransactionType {
  private static readonly INCOME = 'INCOME' as const;
  private static readonly EXPENSE = 'EXPENSE' as const;

  private constructor(private readonly _value: 'INCOME' | 'EXPENSE') {}

  get value(): 'INCOME' | 'EXPENSE' {
    return this._value;
  }

  static income(): TransactionType {
    return new TransactionType(TransactionType.INCOME);
  }

  static expense(): TransactionType {
    return new TransactionType(TransactionType.EXPENSE);
  }

  static fromString(type: string): TransactionType {
    if (type !== 'INCOME' && type !== 'EXPENSE') {
      throw new TransactionTypeValidationError(
        '取引タイプはINCOMEまたはEXPENSEである必要があります',
      );
    }
    return new TransactionType(type);
  }

  isIncome(): boolean {
    return this._value === TransactionType.INCOME;
  }

  isExpense(): boolean {
    return this._value === TransactionType.EXPENSE;
  }

  equals(other: TransactionType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
