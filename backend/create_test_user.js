const mysql = require('mysql2');
const bcrypt = require('bcrypt');
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

async function createTestUser() {
  try {
    // Check if user already exists
    const [existingUsers] = await promisePool.query(
      'SELECT * FROM users WHERE username = ?',
      ['testuser']
    );
    
    if (existingUsers.length > 0) {
      console.log('Test user already exists');
      return;
    }
    
    // Create password hash
    const password = 'password123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Insert test user
    const [result] = await promisePool.query(
      'INSERT INTO users (username, email, password_hash, full_name, profile_picture_url, bio, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        'testuser',
        'test@example.com',
        passwordHash,
        'Test User',
        'https://randomuser.me/api/portraits/men/32.jpg',
        'Test user for development',
        true
      ]
    );
    
    console.log('Test user created successfully');
    console.log('Username: testuser');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    // Close the connection
    await promisePool.end();
  }
}

createTestUser(); 