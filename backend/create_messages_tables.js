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

async function createTables() {
  try {
    // Create conversations table
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        conversation_id INT PRIMARY KEY AUTO_INCREMENT,
        user1_id INT NOT NULL,
        user2_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user1_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY unique_conversation (user1_id, user2_id)
      )
    `);
    console.log('Conversations table created successfully');

    // Create messages table
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        message_id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
    console.log('Messages table created successfully');

    // Create indexes
    const indexes = [
      { table: 'messages', name: 'idx_messages_conversation_id', column: 'conversation_id' },
      { table: 'messages', name: 'idx_messages_sender_id', column: 'sender_id' },
      { table: 'messages', name: 'idx_messages_receiver_id', column: 'receiver_id' },
      { table: 'conversations', name: 'idx_conversations_user1_id', column: 'user1_id' },
      { table: 'conversations', name: 'idx_conversations_user2_id', column: 'user2_id' }
    ];

    for (const index of indexes) {
      try {
        // Check if index exists
        const [rows] = await promisePool.query(`
          SELECT COUNT(1) as count 
          FROM information_schema.statistics 
          WHERE table_schema = ? 
          AND table_name = ? 
          AND index_name = ?
        `, [process.env.DB_NAME, index.table, index.name]);

        if (rows[0].count === 0) {
          // Create index if it doesn't exist
          await promisePool.query(`
            CREATE INDEX ${index.name} ON ${index.table}(${index.column})
          `);
          console.log(`Index ${index.name} created successfully`);
        } else {
          console.log(`Index ${index.name} already exists`);
        }
      } catch (error) {
        console.error(`Error creating index ${index.name}:`, error);
      }
    }

    console.log('All tables and indexes created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    // Close the connection
    await promisePool.end();
  }
}

createTables(); 