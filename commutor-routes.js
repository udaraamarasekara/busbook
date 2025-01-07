// routes.js
const express = require('express');
const db = require('./database');
const router = express.Router();




/**
 * @swagger
 * tags:
 *   name: Commutor
 *   description: Commutor operations
 */

/**
 * @swagger
 * /api/auth/commutor/bus:
 *   get:
 *     summary: Get bus trips between two towns
 *     tags: [Bus]
 *     security:
 *       - AuthorizationHeader: []
 *     parameters:
 *       - in: query
 *         name: start_from
 *         required: true
 *         schema:
 *           type: string
 *           example: Colombo
 *       - in: query
 *         name: end_from
 *         required: true
 *         schema:
 *           type: string
 *           example: Kandy
 *     responses:
 *       200:
 *         description: List of trips between two towns
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   start_at:
 *                     type: string
 *                   end_at:
 *                     type: string
 *                   id:
 *                     type: integer
 *                   busno:
 *                     type: string
 *       404:
 *         description: Route not found
 *       500:
 *         description: Server error
 */


router.get('/bus', async (req, res) => {
    const { start_from, end_from } = req.query;
    const now = new Date();

    try {
        const routeQuery = `
            SELECT id 
            FROM routes 
            WHERE (town_one = ? AND town_two = ?) OR (town_one = ? AND town_two = ?)
        `;
        const routeResult = await new Promise((resolve, reject) =>
            db.query(routeQuery, [start_from, end_from, end_from, start_from], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            })
        );

        if (routeResult.length === 0) {
            return res.status(404).json({ message: 'Route not found' });
        }

        const routeId = routeResult[0].id;

        const tripsQuery = `
            SELECT trips.start_at, trips.end_at, trips.id, busses.busno, busses.seatCount
            FROM trips 
            INNER JOIN busses ON trips.bus = busses.id 
            WHERE trips.start_from = ? AND trips.start_at > ? AND busses.route = ?
        `;
        const tripsResult = await new Promise((resolve, reject) =>
            db.query(tripsQuery, [start_from, now, routeId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            })
        );

        return res.status(200).json(tripsResult);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err });
    }
});



/**
 * @swagger
 * /api/auth/commutor/book:
 *   post:
 *     summary: Book seats for a trip
 *     tags: 
 *       - Bus
 *     security:
 *       - AuthorizationHeader: []
 *     requestBody:
 *       description: Details of the seats to be booked and the trip ID
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seats:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: List of seat numbers to be booked
 *                 example: [1, 2, 3]
 *               trip:
 *                 type: integer
 *                 description: The ID of the trip for booking
 *                 example: 101
 *     responses:
 *       200:
 *         description: Booking placed successfully
 *       400:
 *         description: Invalid seat or trip
 *       500:
 *         description: Server error
 */
router.post('/book', validateBooking, async (req, res) => {
    const { seats, trip } = req.body;
    const userId = req.userId;
  
    const sql = 'INSERT INTO bookings (trip, seat, user) VALUES (?, ?, ?)';
    seats.forEach(async (seat) => {
        const bookingResult = await new Promise((resolve, reject) =>
            db.query(sql, [trip, seat, userId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            })
        );
    });

    return res.status(200).json("Booking Placed");
});

/**
 * @swagger
paths:
  /seat:
    get:
      summary: Get current bookings for a trip
      description: Retrieve all bookings for a specific trip from the database.
      tags:
        - Bookings
      parameters:
        - name: trip
          in: query
          required: true
          description: The trip ID for which to retrieve bookings.
          schema:
            type: string
      responses:
        '200':
          description: Successfully retrieved bookings.
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                      description: The unique identifier of the booking.
                    trip:
                      type: string
                      description: The trip ID associated with the booking.
                    user_id:
                      type: integer
                      description: The unique identifier of the user who made the booking.
                    seat_number:
                      type: string
                      description: The seat number assigned in the booking.
                    status:
                      type: string
                      description: The status of the booking (e.g., confirmed, canceled).
                    created_at:
                      type: string
                      format: date-time
                      description: The date and time when the booking was made.
        '400':
          description: Missing or invalid trip parameter.
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
                    example: Trip parameter is missing or invalid.
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
router.get('/seat', async (req, res) => {
    const trip = req.query.trip;
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
paths:
  /routes:
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
 */

router.get('/routes', async (req, res) => {
    const trip = req.query.trip;
    const sql = 'SELECT * FROM routes';
    db.query(sql, [trip], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Invalid Input', error: err });
        }
        return res.status(200).json(results);
    });
});
/**
 * @swagger
 * /api/auth/commutor/book:
 *   delete:
 *     summary: Delete a booking
 *     tags: [Bus]
 *     security:
 *       - AuthorizationHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Booking deleted successfully
 *       400:
 *         description: Booking ID required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.delete('/book', validateBookingDelete, async (req, res) => {
    try {
        const { id } = req.body;
    
        if (!id) {
            return res.status(400).json({ error: 'Booking ID is required.' });
        }
    
        const sql = 'DELETE FROM bookings WHERE id = ?';
    
        const deleteResult = await new Promise((resolve, reject) =>
            db.query(sql, [id], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            })
        );
    
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Booking not found.' });
        }
    
        return res.status(200).json({ message: 'Booking deleted successfully.' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        return res.status(500).json({ error: 'An error occurred while deleting the booking.' });
    }
});

async function validateBookingDelete(req, res, next) {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Booking ID is required.' });
        }

        const bookingsQuery = 
            "SELECT * FROM bookings WHERE id = ?";

        const bookingResult = await new Promise((resolve, reject) =>
            db.query(bookingsQuery, [id], (err, results) => {
                if (err) return reject(err); // Reject on DB error
                resolve(results); // Resolve with results
            })
        );

        if (bookingResult.length === 0) {
            return res.status(404).json({ message: 'Invalid booking ID.' }); // Return if no booking found
        }

        if (bookingResult[0].user === req.userId) {
            return next(); // Proceed to next middleware
        }

        return res.status(403).json({ message: 'You are not authorized to delete this booking.' });
    } catch (error) {
        console.error('Error in validateBookingDelete:', error);
        return res.status(500).json({ message: 'An error occurred during validation.' });
    }
}

async function validateBooking(req, res,next) {
    const {seats,trip,id} = req.body;
    const tripsQuery = 
   " SELECT *FROM bookings  WHERE trip = ?";      
    const bookingResult = await new Promise((resolve, reject) =>
        db.query(tripsQuery, [trip], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        })
    ); 
    const seatsQuery = 
   " SELECT busses.seatCount FROM trips INNER JOIN busses ON busses.id =trips.bus WHERE trips.id = ?"
    ;   
    const seatCount = await new Promise((resolve, reject) =>
        db.query(seatsQuery, [trip], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        })
    );
    for (const seat of seats) {
        if (seatCount[0].seatCount < seat || seat <= 0) {
          return res.status(400).json({ message:` Invalid seat: ${seat} `});
        }
      }

    for (const element of seats) {
        const booked = bookingResult.some(seat => seat.seat === element); // Check if seat is already booked
        if (booked) {
            return res.status(500).json(`{ message: ${element} already booked }`);
        }
    }

    // If no seats are booked, proceed with the rest of your logic
    next();
}
/**
 * @swagger
paths:
  /bookings:
    get:
      summary: Get user's bookings
      description: Retrieve all bookings made by the authenticated user, including trip details.
      tags:
        - Bookings
      parameters: []
      responses:
        '200':
          description: Successfully retrieved user's bookings.
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                      description: The unique identifier of the booking.
                    seat:
                      type: string
                      description: The seat number assigned to the booking.
                    start_at:
                      type: string
                      format: date-time
                      description: The start time of the trip.
                    end_at:
                      type: string
                      format: date-time
                      description: The end time of the trip.
                    start_from:
                      type: string
                      description: The starting point of the trip.
        '401':
          description: Unauthorized access. User is not authenticated.
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Unauthorized
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
router.get('/bookings', async (req, res) => {
    const sql = 'SELECT  bookings.seat , bookings.id , trips.start_at, trips.end_at, trips.start_from FROM bookings INNER JOIN trips ON trips.id =bookings.trip WHERE bookings.user = ?';
    db.query(sql, [req.userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Invalid Input', error: err });
        }
        return res.status(200).json(results);
    });
});



module.exports = router;
