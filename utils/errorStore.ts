// src/utils/errorStore.ts
let lastEvalError: string | null = null;

export function setLastEvalError(error: string | null) {
    lastEvalError = error;
}

export function getLastEvalError(): string | null {
    return lastEvalError;
}
