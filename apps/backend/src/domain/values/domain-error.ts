// Domain Layer: Base Domain Error
// ドメイン層の基底エラークラス

export class DomainError extends Error {
  constructor(message: string, name?: string) {
    super(message);
    this.name = name || 'DomainError';
    // Error.captureStackTrace が存在する場合のみ実行
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
