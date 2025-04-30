const express = require('express');
const router = express.Router();
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

// Get notifications for a user
router.get('/:userId', async (req, res) => {
  try {
    const [notifications] = await promisePool.query(`
      SELECT 
        n.*,
        u.username as actor_username,
        u.profile_picture_url as actor_profile_picture,
        CASE
          WHEN n.type = 'like' THEN p.content
          WHEN n.type = 'comment' THEN c.content
          WHEN n.type = 'follow' THEN NULL
        END as content
      FROM notifications n
      LEFT JOIN users u ON 
        CASE
          WHEN n.type = 'like' THEN (SELECT user_id FROM likes WHERE post_id = n.reference_id LIMIT 1)
          WHEN n.type = 'comment' THEN (SELECT user_id FROM comments WHERE comment_id = n.reference_id)
          WHEN n.type = 'follow' THEN n.reference_id
        END = u.user_id
      LEFT JOIN posts p ON (n.type = 'like' AND p.post_id = n.reference_id)
      LEFT JOIN comments c ON (n.type = 'comment' AND c.comment_id = n.reference_id)
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [req.params.userId]);
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notifications as read
router.put('/read', async (req, res) => {
  try {
    const { user_id, notification_ids } = req.body;
    
    if (!notification_ids || notification_ids.length === 0) {
      // Mark all notifications as read
      await promisePool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
        [user_id]
      );
    } else {
      // Mark specific notifications as read
      await promisePool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND notification_id IN (?)',
        [user_id, notification_ids]
      );
    }
    
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Get unread notification count
router.get('/:userId/unread', async (req, res) => {
  try {
    const [result] = await promisePool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.params.userId]
    );
    
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    res.status(500).json({ error: 'Failed to fetch unread notification count' });
  }
});

module.exports = router; 