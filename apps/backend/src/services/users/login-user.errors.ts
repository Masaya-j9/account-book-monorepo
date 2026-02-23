import { DomainError } from "../../domain/values/domain-error";

export class InvalidCredentialsError extends DomainError {
	constructor() {
		super(
			"メールアドレスまたはパスワードが正しくありません",
			"InvalidCredentialsError",
		);
	}
}

type UnexpectedLoginUserErrorParams = {
	message: string;
	cause?: Error;
};

export class UnexpectedLoginUserError extends DomainError {
	public readonly cause?: Error;

	constructor(params: UnexpectedLoginUserErrorParams) {
		super(params.message, "UnexpectedLoginUserError");
		if (params.cause) {
			this.cause = params.cause;
		}
	}
}

export type LoginUserError = InvalidCredentialsError | UnexpectedLoginUserError;
