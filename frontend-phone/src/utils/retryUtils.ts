// Retry utility with exponential backoff
export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public originalError: any,
    public attemptCount: number,
    public totalAttempts: number
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryCondition = () => true
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if condition is not met
      if (!retryCondition(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        throw new RetryError(
          `Operation failed after ${maxAttempts} attempts`,
          error,
          attempt,
          maxAttempts
        );
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Specific retry conditions for different operations
export const retryConditions = {
  networkError: (error: any) => {
    return error instanceof TypeError || 
           error.message?.includes('fetch') ||
           error.message?.includes('network') ||
           error.message?.includes('timeout');
  },
  
  serverError: (error: any) => {
    return error.message?.includes('500') ||
           error.message?.includes('502') ||
           error.message?.includes('503') ||
           error.message?.includes('504');
  },
  
  uploadError: (error: any) => {
    return retryConditions.networkError(error) || 
           retryConditions.serverError(error) ||
           error.message?.includes('upload');
  }
};
