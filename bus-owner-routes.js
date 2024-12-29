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

router.put('/trip', validateTrip,validateUser, async (req, res) => {
  const {start_at, end_at, start_from,bus } = req.body;
  const {trip}= req.query;

  const sql = 'UPDATE  trips SET start_at= ?, end_at= ?, start_from= ?,bus= ? WHERE id = ? ';
  db.query(sql, [start_at, end_at, start_from,bus,trip], (err) => {
    if (err) {
     
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
    res.status(201).json({ message: 'Trip uppdated successfully' });
  });
});

router.get('/bus', async (req, res) => {
     
  const sql = 'SELECT * FROM busses WHERE owner= ?';
  db.query(sql,[req.userId], (err,results) => {
    if (err) {
     
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
   return res.status(201).json(results);
  });
});

router.get('/trip',validateBusForTrip, async (req, res) => {
   const {bus} = req.query;
  const sql = 'SELECT * FROM trips WHERE bus = ?';
  db.query(sql,[bus], (err,results) => {
    if (err) {
     
      return res.status(500).json({ message: 'Invalid Input', error: err });
    }
   return res.status(201).json(results);
  });
});

router.get('/booking',validateTripForBookings, async (req, res) => {
  const {trip} = req.query;
 const sql = 'SELECT * FROM bookings WHERE trip = ?';
 db.query(sql,[trip], (err,results) => {
   if (err) {
    
     return res.status(500).json({ message: 'Invalid Input', error: err });
   }
  return res.status(201).json(results);
 });
});

module.exports = router;
