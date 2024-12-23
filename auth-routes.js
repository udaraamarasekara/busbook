const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();
const commutor = require('./commutor-routes');
const ntc = require('./ntc-routes');
const bus_owner = require('./bus-owner-routes');
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Unauthorized' });
  
      req.userId = decoded.id;
      req.role = decoded.role;
      next();
    });
  };

router.use(verifyToken)  


router.use('./commutor',commutor);
router.use('./ntc',ntc);
router.use('./bus_owner',bus_owner);

module.exports = router;
