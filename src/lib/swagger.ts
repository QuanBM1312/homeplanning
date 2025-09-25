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
                description: 'Enter JWT token you get from Clerk'
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
