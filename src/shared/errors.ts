/**
 * Sistema de errores personalizados para el dominio
 * 
 * Este módulo implementa un sistema de errores jerárquico basado en DomainError
 * siguiendo el patrón de errores personalizados de TypeScript.
 * 
 * @module errors
 */

/**
 * Error base para el dominio
 * Extiende el Error nativo de JavaScript con propiedades adicionales
 */
export class DomainError extends Error {
  /**
   * Código único del error
   */
  readonly code: string;

  /**
   * Contexto adicional del error (opcional)
   */
  readonly context?: unknown;

  /**
   * Causa original del error (opcional)
   */
  readonly cause?: unknown;

  /**
   * Timestamp del error
   */
  readonly timestamp: Date;

  /**
   * Crea una nueva instancia de DomainError
   * @param message Mensaje del error
   * @param code Código único del error (default: 'DOMAIN_ERROR')
   * @param context Contexto adicional (opcional)
   * @param cause Causa original (opcional)
   */
  constructor(
    message: string,
    code: string = 'DOMAIN_ERROR',
    context?: unknown,
    cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    // Establecer contexto - si es null explícito, mantenerlo como null
    // Si es undefined, no establecer (dejar undefined)
    if (context !== undefined) {
      this.context = context === null ? null : context;
    }
    this.cause = cause;
    this.timestamp = new Date();
    
    // Mantener la pila de llamadas original
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convierte el error a JSON para logging/serialización
   * @returns Objeto con los datos del error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack?.split('\n').slice(0, 5).join('\n')
    };
  }

  /**
   * Representación en string del error
   * @returns String con información del error
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

/**
 * Error de validación - para errores de validación de datos
 */
export class ValidationError extends DomainError {
  /**
   * Crea una nueva instancia de ValidationError
   * @param message Mensaje del error (default: 'Validation failed')
   * @param field Campo específico que falló (opcional)
   * @param context Contexto adicional (opcional)
   * @param cause Causa original (opcional)
   */
  constructor(
    message: string = 'Validation failed',
    field?: string,
    context?: unknown,
    cause?: unknown
  ) {
    let finalContext;
    
    // Si context es un objeto, úsalo directamente
    if (context !== undefined && typeof context === 'object' && context !== null && !Array.isArray(context)) {
      finalContext = context;
    } else if (field !== undefined && context !== undefined && typeof context !== 'object') {
      // Si field y context son ambos strings o simples, crea contexto con field
      finalContext = { field, message: context };
    } else if (field !== undefined) {
      finalContext = { field };
    }
    
    super(message, 'VALIDATION_ERROR', finalContext, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Error de recurso no encontrado
 */
export class NotFoundError extends DomainError {
  /**
   * Crea una nueva instancia de NotFoundError
   * @param resource Tipo de recurso (default: 'Resource')
   * @param id ID del recurso no encontrado (opcional)
   * @param context Contexto adicional (opcional)
   * @param cause Causa original (opcional)
   */
  constructor(
    resource: string = 'Resource',
    id?: string,
    context?: unknown,
    cause?: unknown
  ) {
    let message = `${resource} not found`;
    let finalContext;
    
    if (id) {
      message = `${resource} with ID ${id} not found`;
      finalContext = { resource, id };
    } else {
      finalContext = { resource };
    }
    
    // Si se pasó contexto adicional, combínalo
    if (context !== undefined) {
      finalContext = { ...finalContext, ...(typeof context === 'object' && context !== null ? context : {}) };
    }
    
    super(message, 'NOT_FOUND', finalContext, cause);
    this.name = 'NotFoundError';
  }
}

/**
 * Error interno del servidor
 */
export class InternalServerError extends DomainError {
  /**
   * Crea una nueva instancia de InternalServerError
   * @param message Mensaje del error (default: 'Internal server error occurred')
   * @param context Contexto adicional (opcional)
   * @param cause Causa original (opcional)
   */
  constructor(
    message: string = 'Internal server error occurred',
    context?: unknown,
    cause?: unknown
  ) {
    super(message, 'INTERNAL_SERVER_ERROR', context, cause);
    this.name = 'InternalServerError';
  }
}

/**
 * Error de autenticación requerida
 */
export class UnauthorizedError extends DomainError {
  /**
   * Crea una nueva instancia de UnauthorizedError
   * @param message Mensaje del error (default: 'Authentication required')
   * @param context Contexto adicional (opcional)
   * @param cause Causa original (opcional)
   */
  constructor(
    message: string = 'Authentication required',
    context?: unknown,
    cause?: unknown
  ) {
    super(message, 'UNAUTHORIZED', context, cause);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error de acceso prohibido
 */
export class ForbiddenError extends DomainError {
  /**
   * Crea una nueva instancia de ForbiddenError
   * @param message Mensaje del error (default: 'Access denied')
   * @param context Contexto adicional (opcional)
   * @param cause Causa original (opcional)
   */
  constructor(
    message: string = 'Access denied',
    context?: unknown,
    cause?: unknown
  ) {
    super(message, 'FORBIDDEN', context, cause);
    this.name = 'ForbiddenError';
  }
}

/**
 * Error de conflicto de recursos
 */
export class ConflictError extends DomainError {
  /**
   * Crea una nueva instancia de ConflictError
   * @param message Mensaje del error (default: 'Resource conflict occurred')
   * @param context Contexto adicional (opcional)
   * @param cause Causa original (opcional)
   */
  constructor(
    message: string = 'Resource conflict occurred',
    context?: unknown,
    cause?: unknown
  ) {
    super(message, 'CONFLICT', context, cause);
    this.name = 'ConflictError';
  }
}

/**
 * Error de solicitud incorrecta
 */
export class BadRequestError extends DomainError {
  /**
   * Crea una nueva instancia de BadRequestError
   * @param message Mensaje del error (default: 'Bad request')
   * @param context Contexto adicional (opcional)
   * @param cause Causa original (opcional)
   */
  constructor(
    message: string = 'Bad request',
    context?: unknown,
    cause?: unknown
  ) {
    super(message, 'BAD_REQUEST', context, cause);
    this.name = 'BadRequestError';
  }
}

/**
 * Error de red o comunicación
 */
export class NetworkError extends DomainError {
  /**
   * Crea una nueva instancia de NetworkError
   * @param message Mensaje del error (default: 'Network request failed')
   * @param context Contexto adicional (opcional)
   * @param cause Causa original (opcional)
   */
  constructor(
    message: string = 'Network request failed',
    context?: unknown,
    cause?: unknown
  ) {
    super(message, 'NETWORK_ERROR', context, cause);
    this.name = 'NetworkError';
  }
}

// Exportaciones adicionales para compatibilidad
export const DomainErrors = {
  ValidationError,
  NotFoundError,
  InternalServerError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  NetworkError,
};
