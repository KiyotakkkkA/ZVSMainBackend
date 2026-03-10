export type ConfigErrorDefinition = {
  code: string;
  message: string;
};

export const CONFIG_ERRORS = {
  MISSING_ENV_VAR: {
    code: 'CONFIG_MISSING_ENV_VAR',
    message: 'Отсутствует обязательная переменная окружения',
  },
  ENV_VAR_MUST_BE_NUMBER: {
    code: 'CONFIG_ENV_VAR_MUST_BE_NUMBER',
    message: 'Переменная окружения должна быть числом',
  },
} as const satisfies Record<string, ConfigErrorDefinition>;

export function configError(
  error: ConfigErrorDefinition,
  variableName: string,
): string {
  return `[${error.code}] ${error.message}: ${variableName}`;
}
