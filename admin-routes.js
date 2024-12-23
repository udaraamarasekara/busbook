const express = require('express');


const router = express.Router();
const verifyAdmin = (req, res, next) => {
      if (req.role!='admin') return res.status(401).json({ message: 'Unauthorized' }); 
      next();
  };

  router.post('/register-user', async (req, res) => {
    const { username, email, password,role } = req.body;
  
    if (!username || !email || !password||!role) {
      return res.status(400).json({ message: 'All fields are required' });
    }
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const sql = 'INSERT INTO users (name, email, password,role) VALUES (?, ?, ?, ?)';
    db.query(sql, [username, email, hashedPassword], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'User already exists' });
        }
        return res.status(500).json({ message: 'Database error', error: err });
      }
      res.status(201).json({ message: 'User registered successfully' });
    });
  });

router.use(verifyAdmin)  
module.exports = router;
