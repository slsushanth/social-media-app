const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createTables() {
  try {
    const connection = await pool.getConnection();
    
    // Check users table structure
    const [userColumns] = await connection.query('SHOW COLUMNS FROM users');
    console.log('Users table structure:', userColumns);

    // Create likes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        post_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id),
        UNIQUE KEY unique_like (user_id, post_id)
      )
    `);
    console.log('Likes table created successfully');

    // Create follows table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id INT PRIMARY KEY AUTO_INCREMENT,
        follower_id INT NOT NULL,
        following_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (follower_id) REFERENCES users(user_id),
        FOREIGN KEY (following_id) REFERENCES users(user_id),
        UNIQUE KEY unique_follow (follower_id, following_id)
      )
    `);
    console.log('Follows table created successfully');

    connection.release();
    console.log('All tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createTables(); 