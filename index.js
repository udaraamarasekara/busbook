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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(bodyParser.json());

app.use(cors());
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/guest',guestRoutes)

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});