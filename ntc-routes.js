const express = require('express');


const router = express.Router();
const verifyNtc = (req, res, next) => {
    if (req.role!='ntc') return res.status(401).json({ message: 'Unauthorized' }); 
    next();
};
router.use(verifyNtc)  
module.exports = router;
