const express = require('express');
const db = require('./database');
const swaggerUi = require('swagger-ui-express');
const router = express.Router();
const verifyBusOwner = (req, res, next) => {
      if (req.role!='bus-owner') return res.status(401).json({ message: 'Unauthorized' }); 
      next();
  };
router.use(verifyBusOwner) 

function processDateTime(dateTime) {
  const date = new Date(dateTime);
  const now = new Date();
  if(date instanceof Date && !isNaN(date) && date>now)
   { return  date ;
   }
   else{
    return "Invalid Date!"
   }
}

const validateUser = (req,res,next)=>{
  const {trip}=req.query
  const sql = 'SELECT busses.owner from trips  INNER JOIN busses ON trips.bus = busses.id WHERE trips.id = ?';
  db.query(sql, [trip], (err,result) => {
    if (err) {
     
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    if(result[0].owner===req.userId)
    {
      return next();
    }
    return res.status(500).json({ message: 'Invalid Input', error: err });

  });
}

const validateBusForTrip = (req,res,next)=>{
  const {bus} = req.query
  const sql = 'SELECT * FROM busses WHERE id = ? AND owner= ?';
  db.query(sql, [bus,req.userId], (err,results) => {
    if (err) {
     
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    if(results.length===0) 
    {
      return res.status(201).json({ message: 'invalid request' });
    }
    next();
  });
}
const validateTripForBookings = async (req, res, next) => {
  const { trip } = req.query;

  try {
    
    
    const tripResults = await new Promise((resolve, reject) =>
      db.query('SELECT * FROM trips WHERE id = ?', [trip], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      })
    );
    if (tripResults.length === 0) {
      return res.status(400).json({ message: 'Invalid request: Trip not found' });
    }
    const busId = tripResults[0].bus;

    // Query to check bus ownership
    const busResults = await new Promise((resolve, reject) =>
      db.query('SELECT * FROM busses WHERE id = ?', [busId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      })
    );
    if (busResults.length === 0) {
      return res.status(400).json({ message: 'Invalid request: Bus not found' });
    }
    if (busResults[0].owner !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized: You are not the owner of this bus' });
    }
    console.log(busResults[0].owner);

    next();
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err });
  }
};



const validateTrip = (req, res, next) => {
  const { start_at, end_at, start_from, bus } = req.body;

  const processedStartAt = processDateTime(start_at);
  const processedEndAt = processDateTime(end_at);

  if (processedEndAt <= processedStartAt) {
    return res.status(400).json({ message: 'Invalid Input', error: 'End time must be after start time' });
  }

  const routeSql = 
   " SELECT busses.id, busses.owner, routes.town_one, routes.town_two FROM busses INNER JOIN routes ON busses.route = routes.id WHERE busses.id = ?";

  db.query(routeSql, [bus], (routeErr, routeResults) => {
    if (routeErr || routeResults.length === 0) {
      return res.status(400).json({ message: 'Invalid Input', error: 'No such bus or route' });
    }

    const matchingRoutes = routeResults.filter(
      (route) => route.town_one === start_from || route.town_two === start_from
    );

    if (matchingRoutes.length === 0) {
      return res.status(400).json({ message: 'Invalid Input', error: 'Check route again' });
    }

    const tripSql = 
    "  SELECT * FROM trips   WHERE bus = ? AND end_at > ?";

    db.query(tripSql, [bus, processedStartAt], (tripErr, tripResults) => {
      if (tripErr) {
        return res.status(500).json({ message: 'Database Error', error: tripErr.message });
      }

      if (tripResults.length > 0) {
        return res.status(400).json({ message: 'Invalid Input', error: 'Check time again' });
      }

      next(); // All validations passed
    });
  });
};





/**
 * @swagger
 * api/auth/bus-owner/trip:
 *   post:
 *     summary: Add a new bus trip
 *     tags: [Trips]
 *     security:
 *       - AuthorizationHeader: []
 * 
 *       - in: body
 *         name: trip
 *         description: Trip details
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             start_at:
 *               type: string
 *               format: date-time
 *               example: "2024-12-31T10:00:00Z"
 *             end_at:
 *               type: string
 *               format: date-time
 *               example: "2024-12-31T12:00:00Z"
 *             start_from:
 *               type: string
 *               example: "Colombo"
 *             bus:
 *               type: integer
 *               example: 1
 *     responses:
 *       201:
 *         description: Trip added successfully
 *       400:
 *         description: Invalid Input
 *       500:
 *         description: Database Error
 */
router.post('/trip', validateTrip, async (req, res) => {
  const { start_at, end_at, start_from, bus } = req.body;
  const sql = 'INSERT INTO trips (start_at, end_at, start_from, bus) VALUES (?, ?, ?, ?)';
  db.query(sql, [start_at, end_at, start_from, bus], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    res.status(201).json({ message: 'Trip added successfully' });
  });
});

/**
 * @swagger
 * /api/auth/bus-owner/trip:
 *   put:
 *     summary: Update an existing bus trip
 *     tags: 
 *       - Trips
 *     security:
 *       - AuthorizationHeader: []
 *     parameters:
 *       - in: query
 *         name: trip
 *         description: The ID of the trip to be updated
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       description: Updated trip details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               start_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T10:00:00Z"
 *               end_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T12:00:00Z"
 *               start_from:
 *                 type: string
 *                 example: "Colombo"
 *               bus:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Trip updated successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Database error
 */

router.put('/trip', validateTrip, validateUser, async (req, res) => {
  const { start_at, end_at, start_from, bus } = req.body;
  const { trip } = req.query;

  const sql = 'UPDATE trips SET start_at = ?, end_at = ?, start_from = ?, bus = ? WHERE id = ?';
  db.query(sql, [start_at, end_at, start_from, bus, trip], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    res.status(201).json({ message: 'Trip updated successfully' });
  });
});

/**
 * @swagger
 * api/auth/bus-owner/bus:
 *   get:
 *     summary: Get buses owned by the current user
 *     tags: [Buses]
 *     security:
 *       - AuthorizationHeader: []
 *     responses:
 *       200:
 *         description: List of buses
 *       500:
 *         description: Database Error
 */
router.get('/bus', async (req, res) => {
  const sql = 'SELECT * FROM busses WHERE owner = ?';
  db.query(sql, [req.userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    return res.status(200).json(results);
  });
});

/**
 * @swagger
 * /api/auth/bus-owner/trip:
 *   get:
 *     summary: Get trips for a specific bus
 *     tags: 
 *       - Trips
 *     security:
 *       - AuthorizationHeader: []
 *     parameters:
 *       - in: query
 *         name: bus
 *         description: The ID of the bus for which trips are to be retrieved.
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: List of trips for the bus
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
 *                   busId:
 *                     type: integer
 *                     description: ID of the bus associated with the trip
 *                   startTime:
 *                     type: string
 *                     format: date-time
 *                     description: Start time of the trip
 *                   endTime:
 *                     type: string
 *                     format: date-time
 *                     description: End time of the trip
 *                   status:
 *                     type: string
 *                     description: Status of the trip (e.g., scheduled, completed)
 *       500:
 *         description: Database error
 */

router.get('/trip', validateBusForTrip, async (req, res) => {
  const { bus } = req.query;
  const sql = 'SELECT * FROM trips WHERE bus = ?';
  db.query(sql, [bus], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    return res.status(200).json(results);
  });
});
/**
 * @swagger
 * /api/auth/bus-owner/booking:
 *   get:
 *     summary: Get bookings for a trip
 *     tags: 
 *       - Bookings
 *     security:
 *       - AuthorizationHeader: []
 *     parameters:
 *       - in: query
 *         name: trip
 *         id: The ID of the route to be retrieved.
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: List of bookings for the trip
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
 *                   Rouote    :
 *                     type: string
 *                     description: town one
 *                   seatNumber:
 *                     type: string
 *                     description: Seat number assigned to the passenger
 *                   status:
 *                     type: string
 *                     description: Booking status (e.g., confirmed, pending, canceled)
 *       500:
 *         description: Database error
 */
router.get('/booking',validateTripForBookings, async (req, res) => {
  const { trip } = req.query;
  const sql = 'SELECT * FROM bookings WHERE trip = ?';
  db.query(sql, [trip], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    return res.status(200).json(results);
  });
});



/**
 * @swagger
 * /api/auth/bus-owner/routes:
 *   get:
 *     summary: Get trips for a specific bus
 *     tags: 
 *       - Trips
 *     security:
 *       - AuthorizationHeader: []
 *     parameters:
 *       - in: query
 *         name: route
 *         description: The ID of the route  to be retrieved.
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: List of routes for the bus
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Route ID
 *                   town_one:
 *                     type: integer
 *                     description: town one
 *                   town_two:
 *                     
 *                     description:town two
 *       500:
 *         description: Database error
 */

router.get('/trip', validateBusForTrip, async (req, res) => {
  const { bus } = req.query;
  const sql = 'SELECT * FROM trips WHERE bus = ?';
  db.query(sql, [bus], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    return res.status(200).json(results);
  });
});
/**
 * @swagger
paths:
  /route:
    get:
      summary: Retrieve route details by ID
      description: Fetch route details from the database using the provided ID.
      tags:
        - Routes
      parameters:
        - name: id
          in: query
          required: true
          description: The ID of the route to retrieve.
          schema:
            type: string
      responses:
        '200':
          description: Successfully retrieved route details.
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
        '400':
          description: Missing or invalid ID parameter.
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
                    example: Invalid ID parameter
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
 */
router.get('/route', async (req, res) => {
  const { id } = req.query;
  const sql = 'SELECT * FROM routes WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    return res.status(200).json(results);
  });
});

module.exports = router;
