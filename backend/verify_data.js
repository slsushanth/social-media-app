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

async function verifyData() {
  try {
    // Check users
    const [users] = await promisePool.query('SELECT * FROM users');
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.full_name})`);
    });
    
    // Check posts
    const [posts] = await promisePool.query('SELECT * FROM posts');
    console.log(`\nFound ${posts.length} posts:`);
    posts.forEach(post => {
      console.log(`- Post ID: ${post.post_id}, Content: ${post.content.substring(0, 50)}...`);
    });
    
    // Check comments
    const [comments] = await promisePool.query('SELECT * FROM comments');
    console.log(`\nFound ${comments.length} comments:`);
    comments.forEach(comment => {
      console.log(`- Comment ID: ${comment.comment_id}, Content: ${comment.content}`);
    });
    
    // Check likes
    const [likes] = await promisePool.query('SELECT * FROM likes');
    console.log(`\nFound ${likes.length} likes`);
    
    // Check followers
    const [followers] = await promisePool.query('SELECT * FROM followers');
    console.log(`\nFound ${followers.length} follower relationships`);
    
    // Check notifications
    const [notifications] = await promisePool.query('SELECT * FROM notifications');
    console.log(`\nFound ${notifications.length} notifications`);
    
    // Check hashtags
    const [hashtags] = await promisePool.query('SELECT * FROM hashtags');
    console.log(`\nFound ${hashtags.length} hashtags:`);
    hashtags.forEach(hashtag => {
      console.log(`- #${hashtag.tag_name}`);
    });
    
    // Check post_hashtags
    const [postHashtags] = await promisePool.query('SELECT * FROM post_hashtags');
    console.log(`\nFound ${postHashtags.length} post-hashtag relationships`);
    
    console.log('\nData verification complete!');
  } catch (error) {
    console.error('Error verifying data:', error);
  } finally {
    // Close the connection pool
    await promisePool.end();
  }
}

verifyData(); 