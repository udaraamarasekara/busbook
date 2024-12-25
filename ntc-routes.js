const express = require('express');
const {validateUser}= require('common-middleware')
const validateUser = require('./validate-user')

const router = express.Router();
const verifyNtc = (req, res, next) => {
    if (req.role!='ntc') return res.status(401).json({ message: 'Unauthorized' }); 
    next();
};
router.use(verifyNtc)  
const validateBus = (req, res, next) => {
 
  if(req.permitNo.length > 50 || req.owner.length > 50 || req.busno.length > 50  || req.route.length > 50)
    { 
      return res.status(400).json({ message: 'Invalid data' });
    }
    if (!req.permitNo || !req.owner || !req.busno||!req.route) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    var sql = 'SELECT * FROM users WHERE role ="bus-owner" AND id = ?';
    db.query(sql, [req.owner], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
  
      if (results.length === 0) {
        return res.status(404).json({ message: 'Bus owner not found' });
      }
  
     });
      sql = 'SELECT * FROM routes WHERE id = ?';

     db.query(sql, [req.route], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
  
      if (results.length === 0) {
        return res.status(404).json({ message: 'Bus owner not found' });
      }
  
     });
      
  next();
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
   
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const sql = 'INSERT INTO busses (permitNo, owner, route,busno) VALUES (?, ?, ?, ?)';
    db.query(sql, [permitNo, owner, route,busno], (err) => {
      if (err) {
       
        return res.status(500).json({ message: 'Database error', error: err });
      }
      res.status(201).json({ message: 'Bus added successfully' });
    });
  });


module.exports = router;
