import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import type { ApiResponse } from "../types/index";

export function errorHandler(
  error: Error,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }

  // Handle validation errors from zod
  if (error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: error.message,
    });
  }

  // Handle database constraint errors
  if (error.message.includes('duplicate key value')) {
    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { message: error.message }),
  });
}

export function notFoundHandler(req: Request, res: Response<ApiResponse>) {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
}