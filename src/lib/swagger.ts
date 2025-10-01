import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Homeplanning App API',
      version: '1.0.0',
      description: 'API documentation for the Homeplanning application, serving both web and mobile clients.',
    },
    servers: [
      {
        url: '/api',
        description: 'Development server',
      },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter JWT token from Clerk authentication. For mobile apps, use the token received from /api/auth/mobile endpoint.'
            }
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    userId: {
                        type: 'string',
                        description: 'Clerk user ID'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'User email address'
                    },
                    firstName: {
                        type: 'string',
                        description: 'User first name'
                    },
                    lastName: {
                        type: 'string',
                        description: 'User last name'
                    }
                }
            },
            AuthResponse: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: true
                    },
                    userId: {
                        type: 'string',
                        description: 'Clerk user ID'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'User email address'
                    },
                    firstName: {
                        type: 'string',
                        description: 'User first name'
                    },
                    lastName: {
                        type: 'string',
                        description: 'User last name'
                    }
                }
            }
        }
    },
    security: [
        {
            BearerAuth: []
        }
    ]
  },
  apis: ['./src/app/api/**/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
