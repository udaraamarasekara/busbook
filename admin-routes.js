const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./database');
const validateUser = require('./validate-user')


const router = express.Router();
const verifyAdmin = (req, res, next) => {
      if (req.role!='admin') return res.status(401).json({ message: 'Unauthorized' }); 
      next();
  };
  router.use(verifyAdmin)  

  router.post('/register-ntc',validateUser, async (req, res) => {
    const {name, email, password } = req.body;
   
    if(name.length > 50 || email.length > 50 || password.length > 50 )
    {
      return res.status(400).json({ message: 'Invalid data' });
    }
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const sql = 'INSERT INTO users (name, email, password,role) VALUES (?, ?, ?, "ntc")';
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

module.exports = router;
