export type AuthErrorDefinition = {
  code: string;
  message: string;
};

export const AUTH_ERRORS = {
  PASSWORD_CONFIRM_MISMATCH: {
    code: 'AUTH_PASSWORD_CONFIRM_MISMATCH',
    message: 'Подтверждение пароля не совпадает',
  },
  USER_ALREADY_EXISTS: {
    code: 'AUTH_USER_ALREADY_EXISTS',
    message: 'Пользователь с таким email уже существует',
  },
  INVALID_CREDENTIALS: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Неверный email или пароль',
  },
  USER_NOT_FOUND: {
    code: 'AUTH_USER_NOT_FOUND',
    message: 'Пользователь не найден',
  },
  USER_ALREADY_VERIFIED: {
    code: 'AUTH_USER_ALREADY_VERIFIED',
    message: 'Пользователь уже подтвержден',
  },
  ACCOUNT_NOT_ACTIVE: {
    code: 'AUTH_ACCOUNT_NOT_ACTIVE',
    message: 'Аккаунт не активирован. Подтвердите email для доступа.',
  },
  INSUFFICIENT_ROLE: {
    code: 'AUTH_INSUFFICIENT_ROLE',
    message: 'Недостаточно прав для выполнения этого действия',
  },
  INVALID_VERIFICATION_REQUEST: {
    code: 'AUTH_INVALID_VERIFICATION_REQUEST',
    message: 'Некорректные данные запроса',
  },
  INVALID_VERIFICATION_CODE: {
    code: 'AUTH_INVALID_VERIFICATION_CODE',
    message: 'Неверный код подтверждения',
  },
  INVALID_VERIFICATION_TOKEN: {
    code: 'AUTH_INVALID_VERIFICATION_TOKEN',
    message: 'Неверный токен подтверждения',
  },
  SESSION_NOT_FOUND_OR_REVOKED: {
    code: 'AUTH_SESSION_NOT_FOUND_OR_REVOKED',
    message: 'Сессия не найдена или уже отозвана',
  },
  INVALID_REFRESH_TOKEN: {
    code: 'AUTH_INVALID_REFRESH_TOKEN',
    message: 'Недействительный или истекший refresh token',
  },
  REFRESH_TOKEN_DEVICE_MISMATCH: {
    code: 'AUTH_REFRESH_TOKEN_DEVICE_MISMATCH',
    message: 'Refresh token недействителен для этого устройства',
  },
  SESSION_NOT_FOUND_AFTER_REFRESH: {
    code: 'AUTH_SESSION_NOT_FOUND_AFTER_REFRESH',
    message: 'Сессия не найдена после обновления токена',
  },
  SESSION_NOT_FOUND: {
    code: 'AUTH_SESSION_NOT_FOUND',
    message: 'Сессия не найдена',
  },
} as const satisfies Record<string, AuthErrorDefinition>;

export function authError(error: AuthErrorDefinition): AuthErrorDefinition {
  return error;
}
