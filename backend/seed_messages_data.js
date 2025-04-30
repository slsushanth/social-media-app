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

async function seedMessagesData() {
  try {
    // Sample conversations data - creating conversations between all users
    const conversations = [
      { user1_id: 1, user2_id: 2 },
      { user1_id: 1, user2_id: 3 },
      { user1_id: 1, user2_id: 4 },
      { user1_id: 1, user2_id: 5 },
      { user1_id: 2, user2_id: 3 },
      { user1_id: 2, user2_id: 4 },
      { user1_id: 2, user2_id: 5 },
      { user1_id: 3, user2_id: 4 },
      { user1_id: 3, user2_id: 5 },
      { user1_id: 4, user2_id: 5 }
    ];

    // Insert conversations
    for (const conv of conversations) {
      await promisePool.query(
        'INSERT IGNORE INTO conversations (user1_id, user2_id) VALUES (?, ?)',
        [conv.user1_id, conv.user2_id]
      );
    }

    // Sample messages data with more realistic conversations
    const messages = [
      // Conversation between user 1 and 2
      { sender_id: 1, receiver_id: 2, content: "Hey Sarah! How's the new UX project going?" },
      { sender_id: 2, receiver_id: 1, content: "Hi John! It's going great! Just finished the wireframes. Want to take a look?" },
      { sender_id: 1, receiver_id: 2, content: "Sure! I'd love to see them. When are you free?" },
      { sender_id: 2, receiver_id: 1, content: "How about tomorrow at 2 PM? I can share my screen." },
      
      // Conversation between user 1 and 3
      { sender_id: 3, receiver_id: 1, content: "John, we need to discuss the sprint planning for next week." },
      { sender_id: 1, receiver_id: 3, content: "Sure Mike, what's on the agenda?" },
      { sender_id: 3, receiver_id: 1, content: "We need to prioritize the new features. Can you prepare a list?" },
      
      // Conversation between user 1 and 4
      { sender_id: 4, receiver_id: 1, content: "Hey John! Can you help me with the API documentation?" },
      { sender_id: 1, receiver_id: 4, content: "Of course Emma! What specific part do you need help with?" },
      { sender_id: 4, receiver_id: 1, content: "I'm having trouble understanding the authentication flow." },
      
      // Conversation between user 2 and 3
      { sender_id: 2, receiver_id: 3, content: "Mike, can we schedule a design review meeting?" },
      { sender_id: 3, receiver_id: 2, content: "Yes Sarah, how about Thursday morning?" },
      { sender_id: 2, receiver_id: 3, content: "Perfect! I'll send out the calendar invite." },
      
      // Conversation between user 2 and 4
      { sender_id: 4, receiver_id: 2, content: "Sarah, the new design looks amazing! Great work!" },
      { sender_id: 2, receiver_id: 4, content: "Thanks Emma! The marketing team's feedback was really helpful." },
      
      // Conversation between user 3 and 4
      { sender_id: 3, receiver_id: 4, content: "Emma, can you prepare the marketing materials for the launch?" },
      { sender_id: 4, receiver_id: 3, content: "Already working on it Mike! Should be ready by tomorrow." },
      { sender_id: 3, receiver_id: 4, content: "Excellent! Let me know when it's done." },
      
      // Conversation between user 1 and 5
      { sender_id: 5, receiver_id: 1, content: "John, I've analyzed the user behavior data. Want to see the results?" },
      { sender_id: 1, receiver_id: 5, content: "Yes Alex! That would be great. What insights did you find?" },
      { sender_id: 5, receiver_id: 1, content: "There are some interesting patterns in user engagement. Let me share the dashboard." },
      
      // Conversation between user 2 and 5
      { sender_id: 2, receiver_id: 5, content: "Alex, can you help me understand these analytics graphs?" },
      { sender_id: 5, receiver_id: 2, content: "Of course Sarah! Which part would you like me to explain?" },
      { sender_id: 2, receiver_id: 5, content: "The user flow visualization is a bit confusing." }
    ];

    // Insert messages
    for (const msg of messages) {
      // Get conversation_id
      const [conversations] = await promisePool.query(
        'SELECT conversation_id FROM conversations WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
        [msg.sender_id, msg.receiver_id, msg.receiver_id, msg.sender_id]
      );

      if (conversations.length > 0) {
        await promisePool.query(
          'INSERT INTO messages (conversation_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)',
          [conversations[0].conversation_id, msg.sender_id, msg.receiver_id, msg.content]
        );
      }
    }

    console.log('Messages data seeded successfully!');
  } catch (error) {
    console.error('Error seeding messages data:', error);
  } finally {
    // Close the connection pool
    await promisePool.end();
  }
}

// Run the seeding function
seedMessagesData(); 