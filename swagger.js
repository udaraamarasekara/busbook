// swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Node.js API',
      version: '1.0.0',
      description: 'A simple API using Node.js',
    },
    servers: [
      {
        url: 'https://busbookapi-2ce7fa2cd5fe.herokuapp.com', // Change this to match your API URL
      },
    ],
  },
  apis: ['./*.js'], // Update the path to match your API route files
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
