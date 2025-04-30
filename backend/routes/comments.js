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

// Get all comments for a post
router.get('/post/:postId', auth, async (req, res) => {
  try {
    const [comments] = await promisePool.query(`
      SELECT c.*, u.username, u.full_name, u.profile_picture_url
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.post_id = ? AND c.is_deleted = FALSE
      ORDER BY c.created_at DESC
    `, [req.params.postId]);
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get a single comment by ID
router.get('/:id', async (req, res) => {
  try {
    const [comment] = await promisePool.query(`
      SELECT c.*, u.username, u.profile_picture_url
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.comment_id = ? AND c.is_deleted = FALSE
    `, [req.params.id]);
    
    if (comment.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    res.json(comment[0]);
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ error: 'Failed to fetch comment' });
  }
});

// Create a new comment
router.post('/', auth, async (req, res) => {
  try {
    const { post_id, user_id, content } = req.body;
    
    if (!post_id || !user_id || !content) {
      return res.status(400).json({ error: 'Post ID, user ID, and content are required' });
    }
    
    const [result] = await promisePool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [post_id, user_id, content]
    );
    
    // Get the newly created comment with user details
    const [comment] = await promisePool.query(`
      SELECT c.*, u.username, u.full_name, u.profile_picture_url
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.comment_id = ?
    `, [result.insertId]);
    
    // Create notification for post owner
    const [post] = await promisePool.query(
      'SELECT user_id FROM posts WHERE post_id = ?',
      [post_id]
    );
    
    if (post[0].user_id !== user_id) {
      await promisePool.query(
        'INSERT INTO notifications (user_id, type, reference_id) VALUES (?, ?, ?)',
        [post[0].user_id, 'comment', result.insertId]
      );
    }
    
    res.status(201).json(comment[0]);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update a comment
router.put('/:id', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    await promisePool.query(
      'UPDATE comments SET content = ? WHERE comment_id = ?',
      [content, req.params.id]
    );
    
    // Get the updated comment with user details
    const [comment] = await promisePool.query(`
      SELECT c.*, u.username, u.full_name, u.profile_picture_url
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.comment_id = ?
    `, [req.params.id]);
    
    res.json(comment[0]);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    await promisePool.query(
      'UPDATE comments SET is_deleted = TRUE WHERE comment_id = ?',
      [req.params.id]
    );
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router; 