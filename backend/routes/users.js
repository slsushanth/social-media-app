const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
require('dotenv').config();

// Create MySQL connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Convert pool to use promises
const promisePool = pool.promise();

// Get all users
router.get('/', auth, async (req, res) => {
  try {
    const [users] = await promisePool.query('SELECT user_id, username, full_name, profile_picture_url, bio FROM users WHERE is_active = TRUE');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get a single user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [user] = await promisePool.query(`
      SELECT user_id, username, email, full_name, profile_picture_url, bio, created_at
      FROM users
      WHERE user_id = ? AND is_active = TRUE
    `, [req.params.id]);
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get follower count
    const [followers] = await promisePool.query(
      'SELECT COUNT(*) as count FROM followers WHERE following_id = ?',
      [req.params.id]
    );
    
    // Get following count
    const [following] = await promisePool.query(
      'SELECT COUNT(*) as count FROM followers WHERE follower_id = ?',
      [req.params.id]
    );
    
    // Get post count
    const [posts] = await promisePool.query(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_deleted = FALSE',
      [req.params.id]
    );
    
    const userData = {
      ...user[0],
      follower_count: followers[0].count,
      following_count: following[0].count,
      post_count: posts[0].count
    };
    
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;
    
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if username or email already exists
    const [existingUser] = await promisePool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    // Insert user
    const [result] = await promisePool.query(
      'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [username, email, password_hash, full_name]
    );
    
    // Get the newly created user (without password)
    const [newUser] = await promisePool.query(
      'SELECT user_id, username, email, full_name, profile_picture_url, bio FROM users WHERE user_id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Get user
    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await promisePool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
      [user.user_id]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        username: user.username
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Return user data (without password) and token
    const { password_hash, ...userData } = user;
    res.json({
      user: userData,
      token: token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Update user
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, bio, profile_picture_url } = req.body;

    // Validate required fields
    if (full_name === undefined || full_name.trim() === '') {
      return res.status(400).json({ message: 'Full name is required' });
    }

    // Get current user data first
    const [currentUser] = await pool.query(
      'SELECT * FROM users WHERE user_id = ?',
      [id]
    );

    if (currentUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Use existing values if not provided in the request
    const updatedData = {
      full_name: full_name.trim(),
      bio: (bio !== undefined ? bio : currentUser[0].bio || '').trim(),
      profile_picture_url: (profile_picture_url !== undefined ? profile_picture_url : currentUser[0].profile_picture_url || '').trim()
    };

    // Build the update query
    const query = `
      UPDATE users 
      SET full_name = ?, 
          bio = ?, 
          profile_picture_url = ?
      WHERE user_id = ?
    `;

    const values = [
      updatedData.full_name,
      updatedData.bio,
      updatedData.profile_picture_url,
      id
    ];

    await pool.query(query, values);

    // Fetch and return the updated user data
    const [updatedUser] = await pool.query(
      'SELECT user_id, username, email, full_name, profile_picture_url, bio FROM users WHERE user_id = ?',
      [id]
    );

    if (updatedUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// Follow a user
router.post('/:id/follow', async (req, res) => {
  try {
    const { follower_id } = req.body;
    
    if (!follower_id) {
      return res.status(400).json({ error: 'Follower ID is required' });
    }
    
    // Check if already following
    const [existingFollow] = await promisePool.query(
      'SELECT * FROM followers WHERE follower_id = ? AND following_id = ?',
      [follower_id, req.params.id]
    );
    
    if (existingFollow.length > 0) {
      // Unfollow
      await promisePool.query(
        'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
        [follower_id, req.params.id]
      );
      
      return res.json({ message: 'User unfollowed successfully' });
    } else {
      // Follow
      await promisePool.query(
        'INSERT INTO followers (follower_id, following_id) VALUES (?, ?)',
        [follower_id, req.params.id]
      );
      
      // Create notification
      await promisePool.query(
        'INSERT INTO notifications (user_id, type, reference_id) VALUES (?, ?, ?)',
        [follower_id, 'follow', req.params.id]
      );
      
      return res.json({ message: 'User followed successfully' });
    }
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Verify token
router.get('/verify-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user data
    const [users] = await promisePool.query(
      'SELECT user_id, username, email, full_name, profile_picture_url, bio FROM users WHERE user_id = ? AND is_active = TRUE',
      [decoded.user_id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({ user: users[0] });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const [users] = await promisePool.query(`
      SELECT user_id, username, email, full_name, profile_picture_url, bio
      FROM users
      WHERE (username LIKE ? OR full_name LIKE ?) AND is_active = TRUE
      LIMIT 10
    `, [`%${q}%`, `%${q}%`]);
    
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router; 