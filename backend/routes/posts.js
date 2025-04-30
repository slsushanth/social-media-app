const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
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

// Get all posts
router.get('/', auth, async (req, res) => {
  try {
    const [posts] = await pool.promise().query(`
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.profile_picture_url,
        COUNT(DISTINCT l.like_id) as like_count,
        COUNT(DISTINCT c.comment_id) as comment_count,
        GROUP_CONCAT(DISTINCT u2.username) as liked_by_users
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN likes l ON p.post_id = l.post_id
      LEFT JOIN comments c ON p.post_id = c.post_id AND c.is_deleted = FALSE
      LEFT JOIN users u2 ON l.user_id = u2.user_id
      WHERE p.is_deleted = FALSE
      GROUP BY p.post_id, u.username, u.full_name, u.profile_picture_url
      ORDER BY p.created_at DESC
    `);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get posts by user ID
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const [posts] = await pool.promise().query(`
      SELECT 
        p.*,
        u.username,
        u.full_name,
        u.profile_picture_url,
        COUNT(DISTINCT l.like_id) as like_count,
        COUNT(DISTINCT c.comment_id) as comment_count,
        GROUP_CONCAT(DISTINCT u2.username) as liked_by_users
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN likes l ON p.post_id = l.post_id
      LEFT JOIN comments c ON p.post_id = c.post_id AND c.is_deleted = FALSE
      LEFT JOIN users u2 ON l.user_id = u2.user_id
      WHERE p.user_id = ? AND p.is_deleted = FALSE
      GROUP BY p.post_id, u.username, u.full_name, u.profile_picture_url
      ORDER BY p.created_at DESC
    `, [req.params.userId]);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// Get a single post
router.get('/:id', auth, async (req, res) => {
  try {
    const [post] = await promisePool.query(`
      SELECT p.*, u.username, u.full_name, u.profile_picture_url,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id AND is_deleted = FALSE) as comment_count,
             (SELECT GROUP_CONCAT(username) FROM likes WHERE post_id = p.post_id) as liked_by_users
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.post_id = ? AND p.is_deleted = FALSE
      GROUP BY p.post_id, u.username, u.full_name, u.profile_picture_url
    `, [req.params.id]);
    
    if (post.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post[0]);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Create a new post
router.post('/', auth, async (req, res) => {
  try {
    const { user_id, content, image_url } = req.body;
    
    if (!user_id || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }
    
    const [result] = await promisePool.query(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [user_id, content, image_url || null]
    );
    
    const [post] = await promisePool.query(
      'SELECT * FROM posts WHERE post_id = ?',
      [result.insertId]
    );
    
    res.status(201).json(post[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update a post
router.put('/:id', auth, async (req, res) => {
  try {
    const { content, image_url } = req.body;
    
    await promisePool.query(
      'UPDATE posts SET content = ?, image_url = ? WHERE post_id = ?',
      [content, image_url, req.params.id]
    );
    
    const [post] = await promisePool.query(
      'SELECT * FROM posts WHERE post_id = ?',
      [req.params.id]
    );
    
    res.json(post[0]);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post
router.delete('/:id', auth, async (req, res) => {
  try {
    await promisePool.query(
      'UPDATE posts SET is_deleted = TRUE WHERE post_id = ?',
      [req.params.id]
    );
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Like a post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const { user_id } = req.body;
    const post_id = req.params.id;
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user already liked the post
    const [existingLike] = await promisePool.query(
      'SELECT * FROM likes WHERE user_id = ? AND post_id = ?',
      [user_id, post_id]
    );
    
    if (existingLike.length > 0) {
      return res.status(400).json({ error: 'Post already liked' });
    }
    
    // Get the username of the user who is liking the post
    const [user] = await promisePool.query(
      'SELECT username FROM users WHERE user_id = ?',
      [user_id]
    );
    
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Like the post
    await promisePool.query(
      'INSERT INTO likes (user_id, post_id) VALUES (?, ?)',
      [user_id, post_id]
    );
    
    // Create notification for post owner
    const [post] = await promisePool.query(
      'SELECT user_id FROM posts WHERE post_id = ?',
      [post_id]
    );
    
    if (post[0].user_id !== user_id) {
      await promisePool.query(
        'INSERT INTO notifications (user_id, type, reference_id) VALUES (?, ?, ?)',
        [post[0].user_id, 'like', post_id]
      );
    }
    
    res.json({ message: 'Post liked successfully' });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Unlike a post
router.delete('/:id/like', auth, async (req, res) => {
  try {
    const { user_id } = req.body;
    const post_id = req.params.id;
    
    // Check if user has liked the post
    const [existingLike] = await promisePool.query(
      'SELECT * FROM likes WHERE user_id = ? AND post_id = ?',
      [user_id, post_id]
    );
    
    if (existingLike.length === 0) {
      res.status(400).json({ error: 'Post not liked' });
      return;
    }
    
    // Unlike the post
    await promisePool.query(
      'DELETE FROM likes WHERE user_id = ? AND post_id = ?',
      [user_id, post_id]
    );
    
    res.json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
});

module.exports = router; 