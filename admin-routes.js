const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./database');
const validateUser = require('./validate-user');

const router = express.Router();

// Verify if the user has admin role
const verifyAdmin = (req, res, next) => {
  if (req.role != 'admin') return res.status(401).json({ message: 'Unauthorized' });
  next();
};

router.use(verifyAdmin);

/**
 * @swagger
 * /register-ntc:
 *   post:
 *     summary: Register a new NTC user
 *     tags: [Users]
 *     description: Register a new user with "ntc" role.
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *         description: Bearer token for authentication
 *         example: Bearer <your-token-here>
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's name
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 description: User's email address
 *                 example: "johndoe@example.com"
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid data (e.g., missing required fields or data too long)
 *       401:
 *         description: Unauthorized (if the requester is not an admin)
 *       500:
 *         description: Database error or user already exists
 *       409:
 *         description: Conflict (user already exists)
 */
router.post('/register-ntc', validateUser, async (req, res) => {
  const { name, email, password } = req.body;

  if (name.length > 50 || email.length > 50 || password.length > 50) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "ntc")';
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
