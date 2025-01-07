const express = require('express');
const validateUser = require('./validate-user');
const bcrypt = require('bcryptjs');
const db = require('./database');
const router = express.Router();

// Middleware for verifying NTC role
const verifyNtc = (req, res, next) => {
  if (req.role !== 'ntc') return res.status(401).json({ message: 'Unauthorized' });
  next();
};

// Use verifyNtc middleware
router.use(verifyNtc);

// Middleware for validating bus data
const validateBus = async (req, res, next) => {
  const { permitNo, owner, busno, route } = req.body;

  // Check for missing fields
  if (!permitNo || !owner || !busno || !route) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Validate field lengths
  if (permitNo.length > 50 || owner.length > 50 || busno.length > 50 || route.length > 50) {
    return res.status(400).json({ message: 'Invalid data: Field length exceeded' });
  }

  try {
    // Check if the owner exists
    let sql = 'SELECT * FROM users WHERE role = "bus-owner" AND id = ?';
    const [ownerResults] = await new Promise((resolve, reject) => {
      db.query(sql, [owner], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (ownerResults.length === 0) {
      return res.status(404).json({ message: 'Bus owner not found' });
    }

    // Check if the route exists
    sql = 'SELECT * FROM routes WHERE id = ?';
    const [routeResults] = await new Promise((resolve, reject) => {
      db.query(sql, [route], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (routeResults.length === 0) {
      return res.status(404).json({ message: 'Route not found' });
    }

    // All validations passed
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Invalid Input', error: err });
  }
};

// Swagger documentation for /register-bus-owner
/**
 * @swagger
 * /api/auth/ntc/register-bus-owner:
 *   post:
 *     summary: Register a new bus owner
 *     tags: [Auth]
 *     security:
 *       - AuthorizationHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the bus owner
 *               email:
 *                 type: string
 *                 description: The email address of the bus owner
 *               password:
 *                 type: string
 *                 description: The password for the bus owner
 *             required:
 *               - name
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid data or user already exists
 *       500:
 *         description: Database error
 */
router.post('/register-bus-owner', validateUser, async (req, res) => {
  const { name, email, password } = req.body;

  if (name.length > 50 || email.length > 50 || password.length > 50) {
    return res.status(400).json({ message: 'Invalid data' });
  }
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "bus-owner")';
  db.query(sql, [name, email, hashedPassword], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'User already exists' });
      }
      return res.status(500).json({ message: 'Database error', error: err });
    }
    res.status(201).json({ message: 'User registered successfully' });
  });
});

// Swagger documentation for /bus (Adding a Bus)
/**
 * @swagger
 * /api/auth/ntc/bus:
 *   post:
 *     summary: Add a new bus
 *     tags: [auth/ntc]
 *     security:
 *       - AuthorizationHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permitNo:
 *                 type: string
 *                 description: Bus permit number
 *               owner:
 *                 type: integer
 *                 description: ID of the bus owner
 *               route:
 *                 type: integer
 *                 description: ID of the route
 *               busno:
 *                 type: string
 *                 description: Bus number
 *               seatCount:
 *                 type: integer
 *                 description: Number of seats in the bus
 *             required:
 *               - permitNo
 *               - owner
 *               - route
 *               - busno
 *               - seatCount
 *     responses:
 *       201:
 *         description: Bus added successfully
 *       400:
 *         description: Missing or invalid data
 *       500:
 *         description: Database error
 */
router.post('/bus', validateBus, async (req, res) => {
  const { permitNo, owner, route, busno, seatCount } = req.body;

  const sql = 'INSERT INTO busses (permitNo, owner, route, busno, seatCount) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [permitNo, owner, route, busno, seatCount], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    res.status(201).json({ message: 'Bus added successfully' });
  });
});

/**
 * @swagger
 * /api/auth/ntc/bus:
 *   get:
 *     summary: Get all buses
 *     tags: 
 *       - auth/ntc
 *     security:
 *       - AuthorizationHeader: []
 *     parameters:
 *       - name: start_from
 *         in: query
 *         description: Starting point for the bus route.
 *         required: true
 *         schema:
 *           type: string
 *       - name: end_from
 *         in: query
 *         description: Ending point for the bus route.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of buses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Bus ID
 *                   permitNo:
 *                     type: string
 *                     description: Bus permit number
 *                   owner:
 *                     type: integer
 *                     description: ID of the bus owner
 *                   route:
 *                     type: integer
 *                     description: ID of the route
 *                   busno:
 *                     type: string
 *                     description: Bus number
 *                   seatCount:
 *                     type: integer
 *                     description: Number of seats in the bus
 *       500:
 *         description: Database error
 */

router.get('/bus', async (req, res) => {
  const sql = 'SELECT * FROM busses';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    return res.status(200).json(results);
  });
});

// Swagger documentation for /trip (Fetching Trips for a Bus)
/**
 * @swagger
 * /api/auth/ntc/trip:
 *   get:
 *     summary: Get trips for a specific bus
 *     tags: [auth/ntc]
 *     security:
 *       - AuthorizationHeader: []
 *     parameters:
 *         -name: bus
 *         -required: true
 *         schema:
 *           type: integer
 *         description: The ID of the bus
 *     responses:
 *       200:
 *         description: A list of trips for the bus
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Trip ID
 *                   bus:
 *                     type: integer
 *                     description: ID of the bus
 *                   startTime:
 *                     type: string
 *                     description: Start time of the trip
 *                   endTime:
 *                     type: string
 *                     description: End time of the trip
 *       500:
 *         description: Database error
 */
router.get('/trip', async (req, res) => {
  const { bus } = req.query;
  const sql = 'SELECT * FROM trips WHERE bus = ?';
  db.query(sql, [bus], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    return res.status(200).json(results);
  });
});

// Swagger documentation for /booking (Fetching Bookings for a Trip)
/**
 * @swagger
 * /api/auth/ntc/booking:
 *   get:
 *     summary: Get bookings for a specific trip
 *     tags: [auth/ntc]
 *     security:
 *       - AuthorizationHeader: []
 *     parameters:
 *       - in: query
 *         name: trip
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the trip
 *     responses:
 *       200:
 *         description: A list of bookings for the trip
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Booking ID
 *                   trip:
 *                     type: integer
 *                     description: Trip ID
 *                   passengerName:
 *                     type: string
 *                     description: Name of the passenger
 *                   seatNo:
 *                     type: integer
 *                     description: Seat number
 *       500:
 *         description: Database error
 */
router.get('/booking', async (req, res) => {
  const { trip } = req.query;
  const sql = 'SELECT * FROM bookings WHERE trip = ?';
  db.query(sql, [trip], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    return res.status(200).json(results);
  });
});


// Swagger documentation for /booking (Fetching Bookings for a Trip)
/**
 * @swagger
 * /api/auth/ntc/bus-owners:
 *   get:
 *     summary: Get bookings for a specific trip
 *     tags: [auth/ntc]
 *     security:
 *       - AuthorizationHeader: []
 *     responses:
 *       200:
 *         description: A list of bus-owners for the trip
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: user
 *                   name:
 *                     type: text
 *                     description: name
 *       500:
 *         description: Database error
 */
router.get('/bus-owners', async (req, res) => {
  const sql = 'SELECT * FROM users WHERE role = "bus-owner"';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    return res.status(200).json(results);
  });
});

// Swagger documentation for /booking (Fetching Bookings for a Trip)
/**
 * @swagger
paths:
  /api/auth/ntc/routes:
    get:
      summary: Get all routes
      description: Retrieve all available routes from the database.
      tags:
        - Routes
      parameters: []
      responses:
        '200':
          description: Successfully retrieved all routes.
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                      description: The unique identifier of the route.
                    name:
                      type: string
                      description: The name of the route.
                    description:
                      type: string
                      description: The description of the route.
                      nullable: true
        '500':
          description: Server error occurred while processing the request.
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Invalid Input
                  error:
                    type: string
                    example: Database query error
       description: Database error
 */
router.get('/routes', async (req, res) => {
  const sql = 'SELECT * FROM routes';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    return res.status(200).json(results);
  });
});


module.exports = router;
