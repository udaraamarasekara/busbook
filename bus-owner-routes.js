const express = require('express');
const db = require('./database');


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


const validateTrip = (req, res, next) => {
  const { start_at, end_at, start_from, bus } = req.body;

  const processedStartAt = processDateTime(start_at);
  const processedEndAt = processDateTime(end_at);

  if (processedEndAt <= processedStartAt) {
    return res.status(400).json({ message: 'Invalid Input', error: 'End time must be after start time' });
  }

  const routeSql = `
    SELECT busses.id, busses.owner, routes.town_one, routes.town_two 
    FROM busses 
    INNER JOIN routes ON busses.route = routes.id 
    WHERE busses.id = ?
  `;

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

    const tripSql = `
      SELECT * 
      FROM trips 
      WHERE bus = ? AND end_at > ?
    `;

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



router.post('/trip', validateTrip, async (req, res) => {
  const {start_at, end_at, start_from,bus } = req.body;
 

  const sql = 'INSERT INTO trips (start_at, end_at, start_from,bus) VALUES (?, ?, ?, ?)';
  db.query(sql, [start_at, end_at, start_from,bus], (err) => {
    if (err) {
     
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    res.status(201).json({ message: 'Trip added successfully' });
  });
});


module.exports = router;
