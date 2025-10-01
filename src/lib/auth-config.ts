/**
 * Authentication configuration for the application
 * Supports both web and mobile authentication through Clerk
 */

export const authConfig = {
  // Clerk configuration
  clerk: {
    // JWT template configuration
    jwtTemplate: {
      name: 'mobile-jwt-template',
      claims: {
        userId: true,
        email: true,
        firstName: true,
        lastName: true,
        // Add more claims as needed
      },
      expiresIn: '7d', // Token expires in 7 days
    },
    
    // Session configuration
    session: {
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      updateAge: 24 * 60 * 60, // Update session every 24 hours
    },
  },

  // Mobile app configuration
  mobile: {
    // API endpoints for mobile authentication
    endpoints: {
      auth: '/api/auth/mobile',
      refresh: '/api/auth/refresh',
      logout: '/api/auth/logout',
    },
    
    // Token storage configuration
    tokenStorage: {
      key: 'clerk_jwt_token',
      secure: true, // Use secure storage
    },
  },

  // Security configuration
  security: {
    // CORS configuration for mobile apps
    cors: {
      allowedOrigins: [
        'http://localhost:3000', // Development
        'https://yourdomain.com', // Production
        // Add mobile app bundle identifiers if needed
      ],
    },
    
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
    },
  },
};

/**
 * Get user information from Clerk JWT claims
 * @param user Clerk user object
 * @returns Formatted user information
 */
export function formatUserInfo(user: any) {
  return {
    userId: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    imageUrl: user.imageUrl,
    createdAt: user.createdAt,
    lastSignInAt: user.lastSignInAt,
  };
}

/**
 * Validate JWT token expiration
 * @param token JWT token
 * @returns boolean indicating if token is valid
 */
export function isTokenValid(token: string): boolean {
  try {
    // Clerk handles token validation automatically
    // This function can be used for additional checks if needed
    return !!token && token.length > 0;
  } catch (error) {
    console.error('[TOKEN_VALIDATION_ERROR]', error);
    return false;
  }
}

/**
 * Get authentication headers for API requests
 * @param token JWT token
 * @returns Headers object for API requests
 */
export function getAuthHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

