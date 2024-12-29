const express = require('express');
const db = require('./database');

const router = express.Router();


router.get('/bus', async (req, res) => {
    const { start_from, end_from } = req.query; // Use query for GET request
    const now = new Date();

    try {
        // First Query: Find the route
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

        // Second Query: Find trips
        const tripsQuery = `
            SELECT trips.start_at, trips.end_at, trips.id,busses.busno
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

        // Return the trips
        return res.status(200).json(tripsResult);
    } catch (err) {
        // Handle errors
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err });
    }
});

    async function validateBooking(req, res,next) {
        const {seats,trip,id} = req.body;
        const tripsQuery = `
        SELECT *
        FROM bookings 
        WHERE trip = ?
        `;      
        const bookingResult = await new Promise((resolve, reject) =>
            db.query(tripsQuery, [trip], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            })
        ); 
        const seatsQuery = `
        SELECT busses.seatCount
        FROM trips 
        INNER JOIN busses ON busses.id =trips.bus
        WHERE trips.id = ?
        `;   
        const seatCount = await new Promise((resolve, reject) =>
            db.query(seatsQuery, [trip], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            })
        );
        for (const seat of seats) {
            if (seatCount[0].seatCount < seat || seat <= 0) {
              return res.status(400).json({ message: `Invalid seat: ${seat}` });
            }
          }

        for (const element of seats) {
            const booked = bookingResult.some(seat => seat.seat === element); // Check if seat is already booked
            if (booked) {
                return res.status(500).json({ message: `${element} already booked` });
            }
        }
    
        // If no seats are booked, proceed with the rest of your logic
        next();
    }
    
    async function validateBookingDelete(req, res, next) {
        try {
            const { id } = req.body;
    
            if (!id) {
                return res.status(400).json({ message: 'Booking ID is required.' });
            }
    
            const bookingsQuery = `
                SELECT *
                FROM bookings 
                WHERE id = ?
            `;
    
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
    

    router.delete('/book', validateBookingDelete, async (req, res) => {
        try {
            const { id } = req.body; // Ensure the ID is passed in the request body
    
            if (!id) {
                return res.status(400).json({ error: 'Booking ID is required.' });
            }
    
            const sql = 'DELETE FROM bookings WHERE id = ?';
    
            const deleteResult = await new Promise((resolve, reject) =>
                db.query(sql, [id], (err, results) => {
                    if (err) return reject(err); // Reject on error
                    resolve(results); // Resolve on success
                })
            );
    
            if (deleteResult.affectedRows === 0) {
                return res.status(404).json({ error: 'Booking not found.' }); // Return if no rows are affected
            }
    
            return res.status(200).json({ message: 'Booking deleted successfully.' }); // Return success response
        } catch (error) {
            console.error('Error deleting booking:', error);
            return res.status(500).json({ error: 'An error occurred while deleting the booking.' }); // Return error response
        }
    });
    

router.post('/book', validateBooking, async (req, res) => {
    const {seats,trip} = req.body;
    const userId = req.userId;
   
  
    const sql = 'INSERT INTO bookings (trip, seat, user) VALUES (?, ?, ?)';
    seats.forEach(async(seat)=>{
        const bookingResult = await new Promise((resolve, reject) =>
            db.query(sql, [trip, seat, userId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            })
        );

    })
    return res.status(200).json("Booking Placed");

  });
  router.get('/seat', async (req, res) => {
   const trip = req.query.trip
    const sql = 'SELECT * from bookings WHERE trip = ?';
    db.query(sql, [trip], (err,results) => {
      if (err) {
       
        return res.status(500).json({ message: 'Invalid Input', error: err });
      }
       return res.status(200).json(results);
    });
  });

module.exports = router;
