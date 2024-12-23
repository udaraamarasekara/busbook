const express = require('express');


const router = express.Router();
const verifyBusOwner = (req, res, next) => {
      if (req.role!='bus-owner') return res.status(401).json({ message: 'Unauthorized' }); 
      next();
  };
router.use(verifyBusOwner)  
module.exports = router;
