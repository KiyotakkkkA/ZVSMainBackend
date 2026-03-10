export type VstoragesErrorDefinition = {
  code: string;
  message: string;
};

export const VSTORAGES_ERRORS = {
  PERSIST_METADATA_FAILED: {
    code: 'VSTORAGES_PERSIST_METADATA_FAILED',
    message: 'Не удалось сохранить метаданные векторного хранилища',
  },
  STORAGE_NOT_FOUND: {
    code: 'VSTORAGES_STORAGE_NOT_FOUND',
    message: 'Векторное хранилище не найдено',
  },
  FILE_REQUIRED: {
    code: 'VSTORAGES_FILE_REQUIRED',
    message: 'Необходимо передать хотя бы один файл',
  },
  TAG_ALREADY_EXISTS: {
    code: 'VSTORAGES_TAG_ALREADY_EXISTS',
    message: 'Тег с таким именем уже существует',
  },
} as const satisfies Record<string, VstoragesErrorDefinition>;

export function vstoragesError(
  error: VstoragesErrorDefinition,
): VstoragesErrorDefinition {
  return error;
}

export function vstoragesFileTooLargeError(
  fileName: string,
  maxBatchBytes: number,
): VstoragesErrorDefinition {
  return {
    code: 'VSTORAGES_FILE_TOO_LARGE',
    message: `Файл '${fileName}' слишком велик. Максимальный размер файла - ${maxBatchBytes} байт`,
  };
}
