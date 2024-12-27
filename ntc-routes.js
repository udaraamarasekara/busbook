const express = require('express');
const validateUser = require('./validate-user')
const bcrypt = require('bcrypt');
const db = require('./database');

const router = express.Router();
const verifyNtc = (req, res, next) => {
    if (req.role!='ntc') return res.status(401).json({ message: 'Unauthorized' }); 
    next();
};
router.use(verifyNtc)  
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


router.post('/register-bus-owner',validateUser, async (req, res) => {
  const {name, email, password } = req.body;
 
  if(name.length > 50 || email.length > 50 || password.length > 50 )
  {
    return res.status(400).json({ message: 'Invalid data' });
  }
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO users (name, email, password,role) VALUES (?, ?, ?, "bus-owner")';
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


router.post('/bus', validateBus, async (req, res) => {
    const {permitNo, owner, route,busno } = req.body;
   
  
    const sql = 'INSERT INTO busses (permitNo, owner, route,busno) VALUES (?, ?, ?, ?)';
    db.query(sql, [permitNo, owner, route,busno], (err) => {
      if (err) {
       
        return res.status(500).json({ message: 'Invalid Input', error: err });
      }
      res.status(201).json({ message: 'Bus added successfully' });
    });
  });




module.exports = router;
