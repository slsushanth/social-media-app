const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Connected to database successfully!');
    
    // Check users table
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log('Users table exists with', users[0].count, 'records');
    
    // Check posts table
    const [posts] = await connection.execute('SELECT COUNT(*) as count FROM posts');
    console.log('Posts table exists with', posts[0].count, 'records');
    
    // Check comments table
    const [comments] = await connection.execute('SELECT COUNT(*) as count FROM comments');
    console.log('Comments table exists with', comments[0].count, 'records');
    
    // Check likes table
    const [likes] = await connection.execute('SELECT COUNT(*) as count FROM likes');
    console.log('Likes table exists with', likes[0].count, 'records');
    
    // Check follows table
    const [follows] = await connection.execute('SELECT COUNT(*) as count FROM follows');
    console.log('Follows table exists with', follows[0].count, 'records');
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await connection.end();
  }
}

checkDatabase(); 