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

async function seedUsersData() {
  try {
    // Sample users data
    const users = [
      {
        username: 'john_doe',
        email: 'john@example.com',
        password_hash: '$2b$10$YourHashedPasswordHere', // This will be hashed by bcrypt
        full_name: 'John Doe',
        profile_picture_url: 'https://i.pravatar.cc/150?img=1',
        bio: 'Software Engineer | Tech Enthusiast'
      },
      {
        username: 'sarah_smith',
        email: 'sarah@example.com',
        password_hash: '$2b$10$YourHashedPasswordHere',
        full_name: 'Sarah Smith',
        profile_picture_url: 'https://i.pravatar.cc/150?img=2',
        bio: 'UX Designer | Creative Thinker'
      },
      {
        username: 'mike_wilson',
        email: 'mike@example.com',
        password_hash: '$2b$10$YourHashedPasswordHere',
        full_name: 'Mike Wilson',
        profile_picture_url: 'https://i.pravatar.cc/150?img=3',
        bio: 'Product Manager | Problem Solver'
      },
      {
        username: 'emma_brown',
        email: 'emma@example.com',
        password_hash: '$2b$10$YourHashedPasswordHere',
        full_name: 'Emma Brown',
        profile_picture_url: 'https://i.pravatar.cc/150?img=4',
        bio: 'Marketing Specialist | Social Media Expert'
      },
      {
        username: 'alex_chen',
        email: 'alex@example.com',
        password_hash: '$2b$10$YourHashedPasswordHere',
        full_name: 'Alex Chen',
        profile_picture_url: 'https://i.pravatar.cc/150?img=5',
        bio: 'Data Scientist | AI Enthusiast'
      },
      {
        username: 'lisa_parker',
        email: 'lisa@example.com',
        password_hash: '$2b$10$YourHashedPasswordHere',
        full_name: 'Lisa Parker',
        profile_picture_url: 'https://i.pravatar.cc/150?img=6',
        bio: 'Content Writer | Storyteller'
      },
      {
        username: 'david_kim',
        email: 'david@example.com',
        password_hash: '$2b$10$YourHashedPasswordHere',
        full_name: 'David Kim',
        profile_picture_url: 'https://i.pravatar.cc/150?img=7',
        bio: 'Frontend Developer | UI Expert'
      },
      {
        username: 'sophie_taylor',
        email: 'sophie@example.com',
        password_hash: '$2b$10$YourHashedPasswordHere',
        full_name: 'Sophie Taylor',
        profile_picture_url: 'https://i.pravatar.cc/150?img=8',
        bio: 'Project Manager | Team Leader'
      }
    ];

    // Insert users
    for (const user of users) {
      await promisePool.query(
        'INSERT IGNORE INTO users (username, email, password_hash, full_name, profile_picture_url, bio) VALUES (?, ?, ?, ?, ?, ?)',
        [user.username, user.email, user.password_hash, user.full_name, user.profile_picture_url, user.bio]
      );
    }

    console.log('Users data seeded successfully!');
  } catch (error) {
    console.error('Error seeding users data:', error);
  } finally {
    // Close the connection pool
    await promisePool.end();
  }
}

// Run the seeding function
seedUsersData(); 