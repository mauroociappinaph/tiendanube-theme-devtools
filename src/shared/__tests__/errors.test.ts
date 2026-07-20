import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DomainError,
  ValidationError,
  NotFoundError,
  InternalServerError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  NetworkError
} from '../errors';
import { Result } from '../result';

describe('DomainError System - Custom Error Hierarchy', () => {
  describe('DomainError Base Class', () => {
    it('should create a DomainError with default properties', () => {
      const error = new DomainError('Base domain error');
      
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('DomainError');
      expect(error.message).toBe('Base domain error');
      expect(error.code).toBe('DOMAIN_ERROR');
      expect(error.timestamp).toBeDefined();
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.stack).toBeDefined();
    });

    it('should create a DomainError with custom code', () => {
      const error = new DomainError('Custom error', 'CUSTOM_CODE');
      
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.name).toBe('DomainError');
    });

    it('should create a DomainError with context information', () => {
      const context = { 
        field: 'email',
        value: 'invalid-email',
        expected: 'valid-email@example.com'
      };
      
      const error = new DomainError('Validation failed', 'VALIDATION_ERROR', context);
      
      expect(error.context).toEqual(context);
      expect(error.context).toHaveProperty('field');
      expect(error.context).toHaveProperty('value');
      expect(error.context).toHaveProperty('expected');
    });

    it('should handle error chaining with cause', () => {
      const originalError = new Error('Original cause');
      const error = new DomainError('Chained error', 'CHAINED_ERROR', undefined, originalError);
      
      expect(error.cause).toBe(originalError);
      expect(error.cause?.message).toBe('Original cause');
    });

    it('should preserve stack trace', () => {
      const error = new DomainError('Error with stack');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('errors.test.ts');
      expect(error.stack).toContain('DomainError');
    });

    it('should handle toJSON serialization', () => {
      const context = { field: 'username', value: 'admin' };
      const error = new DomainError('Invalid username', 'VALIDATION_ERROR', context);
      
      const json = error.toJSON();
      
      expect(json).toHaveProperty('name', 'DomainError');
      expect(json).toHaveProperty('message', 'Invalid username');
      expect(json).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('context');
      expect(json.context).toEqual(context);
    });

    it('should handle toString representation', () => {
      const error = new DomainError('Test error', 'TEST_CODE');
      const stringRep = error.toString();
      
      expect(stringRep).toContain('DomainError');
      expect(stringRep).toContain('TEST_CODE');
      expect(stringRep).toContain('Test error');
    });
  });

  describe('ValidationError - Error de Validación', () => {
    it('should create a ValidationError with default message', () => {
      const error = new ValidationError();
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
    });

    it('should create a ValidationError with custom message', () => {
      const error = new ValidationError('Email format is invalid');
      
      expect(error.message).toBe('Email format is invalid');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create a ValidationError with field-specific context', () => {
      const error = new ValidationError('Field required', 'username', 'username is required');
      
      expect(error.context).toEqual({
        field: 'username',
        message: 'username is required'
      });
      expect(error.message).toBe('Field required');
    });

    it('should handle multiple field validations', () => {
      const error = new ValidationError(
        'Multiple fields invalid',
        undefined,
        {
          email: 'Invalid email format',
          password: 'Password must be at least 8 characters',
          username: 'Username already taken'
        }
      );
      
      expect(error.context).toEqual({
        email: 'Invalid email format',
        password: 'Password must be at least 8 characters',
        username: 'Username already taken'
      });
    });

    it('should handle validation with regex pattern', () => {
      const error = new ValidationError(
        'Invalid format',
        'phone',
        'Phone must match pattern: +XX-XXXX-XXXX'
      );
      
      expect(error.context).toHaveProperty('field', 'phone');
      expect(error.context).toHaveProperty('message');
    });

    it('should handle validation with min/max constraints', () => {
      const error = new ValidationError(
        'Value out of range',
        'age',
        'Age must be between 18 and 99'
      );
      
      expect(error.context).toEqual({
        field: 'age',
        message: 'Age must be between 18 and 99'
      });
    });

    it('should handle validation with custom validator', () => {
      const customValidator = (value: string) => value.includes('@');
      const error = new ValidationError(
        'Email validation failed',
        'email',
        'Email must contain @ symbol'
      );
      
      expect(error.context).toEqual({
        field: 'email',
        message: 'Email must contain @ symbol'
      });
    });
  });

  describe('NotFoundError - Recurso No Encontrado', () => {
    it('should create a NotFoundError with default message', () => {
      const error = new NotFoundError();
      
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
    });

    it('should create a NotFoundError with resource type', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.context).toEqual({ resource: 'User' });
    });

    it('should create a NotFoundError with resource ID', () => {
      const error = new NotFoundError('User', 'user-123');
      
      expect(error.message).toBe('User with ID user-123 not found');
      expect(error.context).toEqual({
        resource: 'User',
        id: 'user-123'
      });
    });

    it('should create a NotFoundError with custom resource type and ID', () => {
      const error = new NotFoundError('Theme', 'theme-456');
      
      expect(error.message).toBe('Theme with ID theme-456 not found');
      expect(error.context).toEqual({
        resource: 'Theme',
        id: 'theme-456'
      });
    });

    it('should handle not found with additional context', () => {
      const error = new NotFoundError('Product', 'prod-789', {
        category: 'electronics',
        searchQuery: 'iPhone 15'
      });
      
      expect(error.context).toEqual({
        resource: 'Product',
        id: 'prod-789',
        category: 'electronics',
        searchQuery: 'iPhone 15'
      });
    });

    it('should handle not found for nested resources', () => {
      const error = new NotFoundError('Theme file', 'file.css', {
        themeId: 'theme-123',
        filePath: 'assets/css/styles.css'
      });
      
      expect(error.message).toContain('Theme file');
      expect(error.context).toHaveProperty('themeId');
      expect(error.context).toHaveProperty('filePath');
    });
  });

  describe('InternalServerError - Error Interno del Servidor', () => {
    it('should create an InternalServerError with default message', () => {
      const error = new InternalServerError();
      
      expect(error).toBeInstanceOf(InternalServerError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('InternalServerError');
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.message).toBe('Internal server error occurred');
    });

    it('should create an InternalServerError with custom message', () => {
      const error = new InternalServerError('Database connection failed');
      
      expect(error.message).toBe('Database connection failed');
    });

    it('should create an InternalServerError with operation context', () => {
      const error = new InternalServerError('Failed to save theme', {
        operation: 'theme:save',
        themeId: 'theme-123'
      });
      
      expect(error.context).toEqual({
        operation: 'theme:save',
        themeId: 'theme-123'
      });
    });

    it('should handle internal server errors with original error', () => {
      const originalError = new Error('Connection timeout');
      const error = new InternalServerError('Database unavailable', undefined, originalError);
      
      expect(error.cause).toBe(originalError);
      expect(error.message).toBe('Database unavailable');
    });
  });

  describe('UnauthorizedError - No Autorizado', () => {
    it('should create an UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();
      
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('UnauthorizedError');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Authentication required');
    });

    it('should create an UnauthorizedError with reason', () => {
      const error = new UnauthorizedError('Invalid credentials');
      
      expect(error.message).toBe('Invalid credentials');
    });

    it('should create an UnauthorizedError with token context', () => {
      const error = new UnauthorizedError('Invalid token', {
        tokenType: 'JWT',
        tokenId: 'token-abc123'
      });
      
      expect(error.context).toEqual({
        tokenType: 'JWT',
        tokenId: 'token-abc123'
      });
    });
  });

  describe('ForbiddenError - Prohibido', () => {
    it('should create a ForbiddenError with default message', () => {
      const error = new ForbiddenError();
      
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('ForbiddenError');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Access denied');
    });

    it('should create a ForbiddenError with permission context', () => {
      const error = new ForbiddenError('Insufficient permissions', {
        requiredPermission: 'admin',
        userRole: 'user'
      });
      
      expect(error.context).toEqual({
        requiredPermission: 'admin',
        userRole: 'user'
      });
    });
  });

  describe('ConflictError - Conflicto', () => {
    it('should create a ConflictError with default message', () => {
      const error = new ConflictError();
      
      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('ConflictError');
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Resource conflict occurred');
    });

    it('should create a ConflictError with resource context', () => {
      const error = new ConflictError('Username already taken', {
        resource: 'User',
        field: 'username',
        value: 'admin'
      });
      
      expect(error.context).toEqual({
        resource: 'User',
        field: 'username',
        value: 'admin'
      });
    });
  });

  describe('BadRequestError - Solicitud Incorrecta', () => {
    it('should create a BadRequestError with default message', () => {
      const error = new BadRequestError();
      
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('BadRequestError');
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Bad request');
    });

    it('should create a BadRequestError with validation details', () => {
      const error = new BadRequestError('Invalid payload', {
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' }
        ]
      });
      
      expect(error.context).toEqual({
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' }
        ]
      });
    });
  });

  describe('NetworkError - Error de Red', () => {
    it('should create a NetworkError with default message', () => {
      const error = new NetworkError();
      
      expect(error).toBeInstanceOf(NetworkError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Network request failed');
    });

    it('should create a NetworkError with URL context', () => {
      const error = new NetworkError('Failed to fetch from API', {
        url: 'https://api.example.com/themes',
        method: 'GET',
        statusCode: 500
      });
      
      expect(error.context).toEqual({
        url: 'https://api.example.com/themes',
        method: 'GET',
        statusCode: 500
      });
    });

    it('should handle network timeout errors', () => {
      const error = new NetworkError('Request timeout', {
        url: 'https://api.example.com/themes',
        timeout: 5000,
        actualDuration: 6000
      });
      
      expect(error.context).toHaveProperty('timeout', 5000);
      expect(error.context).toHaveProperty('actualDuration', 6000);
    });
  });

  describe('Error Comparison and Matching', () => {
    it('should correctly identify error types using instanceof', () => {
      const validationError = new ValidationError('Test');
      const notFoundError = new NotFoundError('User');
      const domainError = new DomainError('Generic');
      
      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError instanceof DomainError).toBe(true);
      expect(validationError instanceof Error).toBe(true);
      
      expect(notFoundError instanceof NotFoundError).toBe(true);
      expect(notFoundError instanceof DomainError).toBe(true);
      
      expect(domainError instanceof DomainError).toBe(true);
    });

    it('should allow type-safe error handling', () => {
      function handleError(error: DomainError) {
        if (error instanceof ValidationError) {
          return 'Validation error';
        } else if (error instanceof NotFoundError) {
          return 'Not found';
        } else if (error instanceof InternalServerError) {
          return 'Server error';
        }
        return 'Generic error';
      }
      
      const validationErr = new ValidationError('Invalid');
      const notFoundErr = new NotFoundError('User');
      const serverErr = new InternalServerError('Crash');
      
      expect(handleError(validationErr)).toBe('Validation error');
      expect(handleError(notFoundErr)).toBe('Not found');
      expect(handleError(serverErr)).toBe('Server error');
    });

    it('should handle error codes consistently', () => {
      const errors = [
        new ValidationError(),
        new NotFoundError(),
        new InternalServerError(),
        new UnauthorizedError(),
        new ForbiddenError(),
        new ConflictError(),
        new BadRequestError(),
        new NetworkError()
      ];
      
      const expectedCodes = [
        'VALIDATION_ERROR',
        'NOT_FOUND',
        'INTERNAL_SERVER_ERROR',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'CONFLICT',
        'BAD_REQUEST',
        'NETWORK_ERROR'
      ];
      
      errors.forEach((error, index) => {
        expect(error.code).toBe(expectedCodes[index]);
      });
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should simulate theme loading error handling', () => {
      function loadTheme(themeId: string) {
        if (!themeId) {
          return Result.err(new ValidationError('Theme ID is required', 'themeId'));
        }
        
        if (themeId === 'invalid') {
          return Result.err(new NotFoundError('Theme', themeId));
        }
        
        return Result.ok({ id: themeId, name: 'Valid Theme' });
      }
      
      const emptyResult = loadTheme('');
      const notFoundResult = loadTheme('invalid');
      const successResult = loadTheme('theme-123');
      
      expect(emptyResult.isErr).toBe(true);
      expect(emptyResult.error).toBeInstanceOf(ValidationError);
      
      expect(notFoundResult.isErr).toBe(true);
      expect(notFoundResult.error).toBeInstanceOf(NotFoundError);
      
      expect(successResult.isOk).toBe(true);
    });

    it('should simulate API response error handling', () => {
      interface ApiResponse {
        ok: boolean;
        data?: unknown;
        error?: string;
      }
      
      function parseApiResponse(response: ApiResponse): Result<unknown, DomainError> {
        if (!response.ok) {
          if (response.error?.includes('not found')) {
            return Result.err(new NotFoundError('Resource'));
          }
          if (response.error?.includes('validation')) {
            return Result.err(new ValidationError(response.error));
          }
          return Result.err(new InternalServerError('API request failed'));
        }
        return Result.ok(response.data);
      }
      
      const notFoundResponse: ApiResponse = { ok: false, error: 'Theme not found' };
      const validationResponse: ApiResponse = { ok: false, error: 'Invalid theme format' };
      const successResponse: ApiResponse = { ok: true, data: { id: '123' } };
      
      const notFoundResult = parseApiResponse(notFoundResponse);
      const validationResult = parseApiResponse(validationResponse);
      const successResult = parseApiResponse(successResponse);
      
      expect(notFoundResult.isErr).toBe(true);
      expect(notFoundResult.error).toBeInstanceOf(NotFoundError);
      
      expect(validationResult.isErr).toBe(true);
      expect(validationResult.error).toBeInstanceOf(ValidationError);
      
      expect(successResult.isOk).toBe(true);
    });

    it('should simulate form validation with multiple errors', () => {
      interface FormData {
        email: string;
        password: string;
        username: string;
      }
      
      function validateForm(data: FormData): Result<FormData, ValidationError> {
        const errors: Record<string, string> = {};
        
        if (!data.email.includes('@')) {
          errors.email = 'Email must contain @ symbol';
        }
        
        if (data.password.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        }
        
        if (!data.username) {
          errors.username = 'Username is required';
        }
        
        if (Object.keys(errors).length > 0) {
          return Result.err(new ValidationError('Form validation failed', undefined, errors));
        }
        
        return Result.ok(data);
      }
      
      const invalidForm = {
        email: 'invalid-email',
        password: '123',
        username: ''
      };
      
      const validationResult = validateForm(invalidForm);
      
      expect(validationResult.isErr).toBe(true);
      expect(validationResult.error).toBeInstanceOf(ValidationError);
      expect(validationResult.error.context).toHaveProperty('email');
      expect(validationResult.error.context).toHaveProperty('password');
      expect(validationResult.error.context).toHaveProperty('username');
    });
  });

  describe('Error Logging and Debugging', () => {
    it('should provide detailed error information for logging', () => {
      const error = new ValidationError('Email validation failed', 'email', 'Invalid format', new Error('Original cause'));
      
      const logData = {
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          context: error.context,
          timestamp: error.timestamp.toISOString(),
          stack: error.stack?.split('\n').slice(0, 5).join('\n')
        }
      };
      
      expect(logData.error).toHaveProperty('name', 'ValidationError');
      expect(logData.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(logData.error.context).toHaveProperty('field', 'email');
      expect(logData.error).toHaveProperty('timestamp');
    });

    it('should handle error serialization for API responses', () => {
      const error = new NotFoundError('User', 'user-123');
      
      const serialized = {
        error: {
          type: error.name,
          code: error.code,
          message: error.message,
          details: error.context
        }
      };
      
      expect(serialized.error.type).toBe('NotFoundError');
      expect(serialized.error.code).toBe('NOT_FOUND');
      expect(serialized.error.message).toContain('user-123');
      expect(serialized.error.details).toEqual({ resource: 'User', id: 'user-123' });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle errors with empty context', () => {
      const error = new ValidationError('Simple error');
      
      expect(error.context).toBeUndefined();
      expect(error.message).toBe('Simple error');
    });

    it('should handle errors with null context', () => {
      const error = new ValidationError('Error with null context', undefined, null);
      
      expect(error.context).toBeNull();
    });

    it('should handle errors with deeply nested context', () => {
      const error = new InternalServerError('Complex error', {
        operation: {
          name: 'theme:push',
          parameters: {
            themeId: 'theme-123',
            files: ['file1.css', 'file2.js']
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          userId: 'user-456'
        }
      });
      
      expect(error.context).toHaveProperty('operation');
      expect(error.context.operation).toHaveProperty('parameters');
    });

    it('should handle errors with circular references in context', () => {
      const context: any = { message: 'Test' };
      context.self = context; // Circular reference
      
      const error = new ValidationError('Circular error', undefined, context);
      
      // Should not crash, just include the circular reference
      expect(error.context).toBeDefined();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new ValidationError(longMessage);
      
      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(1000);
    });

    it('should handle errors with special characters in messages', () => {
      const specialMessage = 'Error: "quoted" \'single\' `backticks` $variables';
      const error = new ValidationError(specialMessage);
      
      expect(error.message).toBe(specialMessage);
    });
  });
});