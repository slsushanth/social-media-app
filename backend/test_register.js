const express = require('express');
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

async function testUserRegistration() {
  try {
    console.log('Testing user registration...');
    
    // Test user data
    const username = 'test_user_' + Date.now();
    const email = 'test_' + Date.now() + '@example.com';
    const password = 'password123';
    const full_name = 'Test User';
    
    console.log(`Creating user: ${username}`);
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    // Insert user
    const [result] = await promisePool.query(
      'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [username, email, password_hash, full_name]
    );
    
    console.log(`User created with ID: ${result.insertId}`);
    
    // Verify user was created
    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE user_id = ?',
      [result.insertId]
    );
    
    if (users.length > 0) {
      console.log('User successfully stored in database:');
      console.log(users[0]);
    } else {
      console.log('User was not found in database after insertion');
    }
    
    // Clean up - delete the test user
    await promisePool.query(
      'DELETE FROM users WHERE user_id = ?',
      [result.insertId]
    );
    
    console.log('Test user deleted');
    
  } catch (error) {
    console.error('Error in user registration test:', error);
  } finally {
    // Close the connection pool
    await promisePool.end();
  }
}

testUserRegistration(); 