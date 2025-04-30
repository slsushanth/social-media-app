const mysql = require('mysql2');
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

async function verifyDatabase() {
  try {
    // Test connection
    const [rows] = await promisePool.query('SELECT 1');
    console.log('Database connection successful');
    
    // Check if users table exists
    const [tables] = await promisePool.query('SHOW TABLES LIKE "users"');
    if (tables.length === 0) {
      console.error('Users table does not exist!');
      console.log('Please run the database setup script to create the tables.');
      return;
    }
    console.log('Users table exists');
    
    // Check if there are any users
    const [users] = await promisePool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Number of users in database: ${users[0].count}`);
    
    // List all users
    const [userList] = await promisePool.query('SELECT user_id, username, email, is_active FROM users');
    console.log('Users in database:');
    userList.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - Active: ${user.is_active ? 'Yes' : 'No'}`);
    });
    
  } catch (error) {
    console.error('Database verification error:', error);
  } finally {
    // Close the connection
    await promisePool.end();
  }
}

verifyDatabase(); 