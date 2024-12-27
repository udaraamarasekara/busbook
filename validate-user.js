const bcrypt = require('bcrypt');
const db = require('./database'); // Replace with your actual database connection

const validateUser = async (req, res, next) => {
  const { name, email, password } = req.body;

  // Input validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (name.length > 50 || email.length > 50 || password.length > 50) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  try {
    // Check if email already exists
    const emailCheckQuery = 'SELECT * FROM users WHERE email = ?';
    const emailResults = await new Promise((resolve, reject) =>
      db.query(emailCheckQuery, [email], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      })
    );

    if (emailResults.length !== 0) {
      return res.status(400).json({ message: 'User Email already exists' });
    }

    // Check if password already exists
    const passwordCheckQuery = 'SELECT password FROM users';
    const passwordResults = await new Promise((resolve, reject) =>
      db.query(passwordCheckQuery, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      })
    );

    for (const element of passwordResults) {
      const isMatch = await bcrypt.compare(password, element.password);
      if (isMatch) {
        return res.status(400).json({ message: 'User Password already exists' });
      }
    }

    // Hash the password and attach to the request object
    const hashedPassword = await bcrypt.hash(password, 10);
    req.password = hashedPassword;

    // Proceed to the next middleware
    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ message: 'Database error', error });
  }
};

module.exports = validateUser;
