const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./auth-routes');
const guestRoutes = require('./guest-routes');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger'); // import the swagger definition
const cors = require('cors');


dotenv.config();


const app = express();


app.use(bodyParser.json());

app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/guest',guestRoutes)

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     AuthorizationHeader:
 *       type: apiKey
 *       in: header
 *       name: Authorization
 *   responses:
 *     UnauthorizedError:
 *       description: Access token is missing or invalid
 */

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});