import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError, z } from "zod";
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export class DetailedValidationError extends Error {
  public errors: Record<string, string[]>;
  public statusCode = 422;

  constructor(errors: Record<string, string[]>) {
    super('The given data was invalid.');
    this.name = 'DetailedValidationError';
    this.errors = errors;
  }
}

/**
 * Comprehensive validation middleware similar to Laravel
 * Supports body, params, and query validation in one middleware
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate the request
      const validatedData = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Replace request data with validated (and potentially transformed) data
      req.body = validatedData.body || req.body;
      req.params = validatedData.params || req.params;
      req.query = validatedData.query || req.query;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Transform Zod errors to Laravel-like format
        const errors: Record<string, string[]> = {};

        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        // Return validation error response immediately (don't pass to error handler)
        res.status(422).json({
          error: {
            message: 'The given data was invalid.',
            code: 'VALIDATION_ERROR',
            errors,
          },
        });
        return;
      }

      // For other types of errors, pass to the error handler
      next(error);
    }
  };
}

// Specific validation functions for body, params, and query
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        res.status(422).json({
          error: {
            message: 'The given data was invalid.',
            code: 'VALIDATION_ERROR',
            errors,
          },
        });
        return;
      }
      next(error);
    }
  };
}

export function validateParams<T extends ParamsDictionary>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData as ParamsDictionary;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        res.status(422).json({
          error: {
            message: 'The given data was invalid.',
            code: 'VALIDATION_ERROR',
            errors,
          },
        });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery<T extends ParsedQs>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData as ParsedQs;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });

        res.status(422).json({
          error: {
            message: 'The given data was invalid.',
            code: 'VALIDATION_ERROR',
            errors,
          },
        });
        return;
      }
      next(error);
    }
  };
}