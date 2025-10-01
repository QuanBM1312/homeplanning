import logger from './logger';

/**
 * Authentication event logger
 * Logs authentication-related events for monitoring and debugging
 */

export interface AuthEvent {
  event: string;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * Log authentication events
 * @param event Event name
 * @param userId User ID (optional)
 * @param details Additional details (optional)
 */
export function logAuthEvent(
  event: string, 
  userId?: string, 
  details?: Partial<AuthEvent>
) {
  const authEvent: AuthEvent = {
    event,
    userId,
    success: true,
    timestamp: new Date(),
    ...details
  };

  logger.info('Auth Event', authEvent);
}

/**
 * Log authentication errors
 * @param event Event name
 * @param error Error message
 * @param userId User ID (optional)
 * @param details Additional details (optional)
 */
export function logAuthError(
  event: string,
  error: string,
  userId?: string,
  details?: Partial<AuthEvent>
) {
  const authEvent: AuthEvent = {
    event,
    userId,
    success: false,
    error,
    timestamp: new Date(),
    ...details
  };

  logger.error('Auth Error', authEvent);
}

/**
 * Log mobile authentication events
 * @param event Event name
 * @param userId User ID
 * @param deviceInfo Device information
 */
export function logMobileAuthEvent(
  event: string,
  userId: string,
  deviceInfo?: {
    platform?: string;
    version?: string;
    userAgent?: string;
  }
) {
  logAuthEvent(event, userId, {
    ...deviceInfo,
    event: `mobile_${event}`
  });
}

/**
 * Log JWT token events
 * @param event Event name
 * @param userId User ID
 * @param tokenInfo Token information
 */
export function logJWTEvent(
  event: string,
  userId: string,
  tokenInfo?: {
    tokenType?: 'access' | 'refresh';
    expiresAt?: Date;
    issuedAt?: Date;
  }
) {
  logAuthEvent(`jwt_${event}`, userId, tokenInfo ? {
    ...tokenInfo,
    event: `jwt_${event}`
  } : undefined);
}

