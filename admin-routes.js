const express = require('express');


const router = express.Router();
const verifyAdmin = (req, res, next) => {
      if (req.role!='admin') return res.status(401).json({ message: 'Unauthorized' }); 
      next();
  };
router.use(verifyAdmin)  
module.exports = router;
