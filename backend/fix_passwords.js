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

async function fixPasswords() {
  try {
    // Get all users
    const [users] = await promisePool.query('SELECT user_id, username FROM users');
    
    console.log(`Found ${users.length} users to update`);
    
    // Update each user's password
    for (const user of users) {
      // Create a new password hash
      const password = 'password123'; // Default password for all users
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      // Update the user's password
      await promisePool.query(
        'UPDATE users SET password_hash = ? WHERE user_id = ?',
        [passwordHash, user.user_id]
      );
      
      console.log(`Updated password for user: ${user.username}`);
    }
    
    console.log('All user passwords have been updated to: password123');
    
  } catch (error) {
    console.error('Error fixing passwords:', error);
  } finally {
    // Close the connection
    await promisePool.end();
  }
}

fixPasswords(); 