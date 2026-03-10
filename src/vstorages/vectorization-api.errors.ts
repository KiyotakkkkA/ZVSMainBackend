import {
  BadRequestException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';

export type VectorizationErrorDefinition = {
  code: string;
  message: string;
};

type GrpcErrorMapping = {
  errorClass:
    | typeof GatewayTimeoutException
    | typeof BadRequestException
    | typeof ServiceUnavailableException;
  error: VectorizationErrorDefinition;
};

export const VECTORIZATION_ERRORS = {
  CREATE_STORAGE_FAILED: {
    code: 'VECTORIZATION_CREATE_STORAGE_FAILED',
    message: 'Сервис векторизации не смог создать хранилище',
  },
  STORAGE_UUID_NOT_RETURNED: {
    code: 'VECTORIZATION_STORAGE_UUID_NOT_RETURNED',
    message: 'Сервис векторизации не вернул идентификатор хранилища',
  },
  DELETE_STORAGE_FAILED: {
    code: 'VECTORIZATION_DELETE_STORAGE_FAILED',
    message: 'Сервис векторизации не смог удалить хранилище',
  },
  GRPC_INTERACTION_FAILED: {
    code: 'VECTORIZATION_GRPC_INTERACTION_FAILED',
    message: 'Ошибка при взаимодействии с сервисом векторизации',
  },
} as const satisfies Record<string, VectorizationErrorDefinition>;

export const VECTORIZATION_GRPC_ERRORS: Record<string, GrpcErrorMapping> = {
  '4': {
    errorClass: GatewayTimeoutException,
    error: {
      code: 'VECTORIZATION_TIMEOUT',
      message: 'Запрос к сервису векторизации превысил время ожидания',
    },
  },
  '8': {
    errorClass: BadRequestException,
    error: {
      code: 'VECTORIZATION_PAYLOAD_TOO_LARGE',
      message: 'Документ, который вы пытаетесь отправить, слишком велик',
    },
  },
  '14': {
    errorClass: ServiceUnavailableException,
    error: {
      code: 'VECTORIZATION_SERVICE_UNAVAILABLE',
      message: 'Сервис векторизации недоступен',
    },
  },
};

export function vectorizationError(
  error: VectorizationErrorDefinition,
): VectorizationErrorDefinition {
  return error;
}

export function vectorizationGatewayError(
  details?: string,
): VectorizationErrorDefinition & { details?: string } {
  return {
    ...VECTORIZATION_ERRORS.GRPC_INTERACTION_FAILED,
    details,
  };
}
