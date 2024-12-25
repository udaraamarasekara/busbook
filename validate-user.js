const validateUser= (req,res,next)=>{
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required'});
    }
    if(name.length > 50 || email.length > 50 || password.length > 50 )
      {
        return res.status(400).json({ message: 'Invalid data' });
      }
    const hashedPassword = bcrypt.hash(password, 10);
    var sql = 'SELECT * FROM users WHERE email= ?';
    db.query(sql, [email], (err,results) => {
      if (err) {
        
        return res.status(500).json({ message: 'Database error', error: err });
      }});
      if (results.length !== 0) {
        return res.status(400).json({ message: 'User Email already exists' });
      }
      sql = 'SELECT * FROM users WHERE password= ?';
      db.query(sql, [hashedPassword], (err,results) => {
        if (err) {
       
          return res.status(500).json({ message: 'Database error', error: err });
        }});
        if (results.length !== 0) {
          return res.status(400).json({ message: 'User Password already exists' });
        }
      req.password=hashedPassword;  
  }
  module.exports = validateUser