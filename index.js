const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./auth-routes');
const guestRoutes = require('./guest-routes');
const dotenv = require('dotenv');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

dotenv.config();


const app = express();

const options = {
  openapi: '3.0.0',
  definition:{
    openApi:"3.0.0",
    info:{
      title:"busbook api",
      version:"1.0.0",
      description:"api for book buses"
    },
    servers:[{
      url:"https://busbookapi-2ce7fa2cd5fe.herokuapp.com"

    }]
  },
  apis:["./*.js"]
}
const swaggerSpec = swaggerJsDoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/guest',guestRoutes)

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});