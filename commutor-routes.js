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
            SELECT trips.start_at, trips.end_at, busses.id,busses.busno
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

module.exports = router;
