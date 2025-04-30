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

// Get all conversations for a user
router.get('/conversations/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const [conversations] = await promisePool.query(`
      SELECT 
        c.*,
        CASE 
          WHEN c.user1_id = ? THEN u2.username
          ELSE u1.username
        END as other_username,
        CASE 
          WHEN c.user1_id = ? THEN u2.profile_picture_url
          ELSE u1.profile_picture_url
        END as other_profile_picture
      FROM conversations c
      JOIN users u1 ON c.user1_id = u1.user_id
      JOIN users u2 ON c.user2_id = u2.user_id
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.last_message_at DESC
    `, [userId, userId, userId, userId]);
    
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a conversation
router.get('/conversation/:conversationId/messages', async (req, res) => {
  try {
    const [messages] = await promisePool.query(`
      SELECT 
        m.*,
        u.username as sender_username,
        u.profile_picture_url as sender_profile_picture
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      WHERE (m.sender_id, m.receiver_id) IN (
        SELECT user1_id, user2_id FROM conversations WHERE conversation_id = ?
        UNION
        SELECT user2_id, user1_id FROM conversations WHERE conversation_id = ?
      )
      ORDER BY m.created_at ASC
    `, [req.params.conversationId, req.params.conversationId]);
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/send', async (req, res) => {
  try {
    const { sender_id, receiver_id, content } = req.body;
    
    // First, get or create conversation
    let [conversations] = await promisePool.query(
      'SELECT * FROM conversations WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
      [sender_id, receiver_id, receiver_id, sender_id]
    );
    
    let conversationId;
    if (conversations.length === 0) {
      // Create new conversation
      const [result] = await promisePool.query(
        'INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)',
        [sender_id, receiver_id]
      );
      conversationId = result.insertId;
    } else {
      conversationId = conversations[0].conversation_id;
    }
    
    // Insert message
    const [result] = await promisePool.query(
      'INSERT INTO messages (conversation_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)',
      [conversationId, sender_id, receiver_id, content]
    );
    
    // Update conversation last_message_at
    await promisePool.query(
      'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE conversation_id = ?',
      [conversationId]
    );
    
    // Get the newly created message with sender info
    const [newMessage] = await promisePool.query(`
      SELECT 
        m.*,
        u.username as sender_username,
        u.profile_picture_url as sender_profile_picture
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      WHERE m.message_id = ?
    `, [result.insertId]);
    
    res.status(201).json(newMessage[0]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/read', async (req, res) => {
  try {
    const { conversation_id, user_id } = req.body;
    
    await promisePool.query(
      'UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND is_read = FALSE AND (sender_id, receiver_id) IN (SELECT user1_id, user2_id FROM conversations WHERE conversation_id = ? UNION SELECT user2_id, user1_id FROM conversations WHERE conversation_id = ?)',
      [user_id, conversation_id, conversation_id]
    );
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Create a new conversation
router.post('/conversation', async (req, res) => {
  try {
    const { user1_id, user2_id } = req.body;
    
    if (!user1_id || !user2_id) {
      return res.status(400).json({ error: 'Both users are required' });
    }
    
    // Check if conversation already exists
    const [existingConversations] = await promisePool.query(
      'SELECT * FROM conversations WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
      [user1_id, user2_id, user2_id, user1_id]
    );
    
    if (existingConversations.length > 0) {
      // Get the other user's info
      const otherUserId = existingConversations[0].user1_id === user1_id 
        ? existingConversations[0].user2_id 
        : existingConversations[0].user1_id;
      
      const [otherUser] = await promisePool.query(
        'SELECT user_id, username, profile_picture_url FROM users WHERE user_id = ?',
        [otherUserId]
      );
      
      // Return the conversation with the other user's info
      return res.json({
        ...existingConversations[0],
        other_username: otherUser[0].username,
        other_profile_picture: otherUser[0].profile_picture_url
      });
    }
    
    // Create new conversation
    const [result] = await promisePool.query(
      'INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)',
      [user1_id, user2_id]
    );
    
    // Get the other user's info
    const [otherUser] = await promisePool.query(
      'SELECT user_id, username, profile_picture_url FROM users WHERE user_id = ?',
      [user2_id]
    );
    
    // Return the new conversation with the other user's info
    res.status(201).json({
      conversation_id: result.insertId,
      user1_id,
      user2_id,
      created_at: new Date(),
      last_message_at: new Date(),
      other_username: otherUser[0].username,
      other_profile_picture: otherUser[0].profile_picture_url
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

module.exports = router; 