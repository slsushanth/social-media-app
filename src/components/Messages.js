import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  IconButton,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemButton,
  InputAdornment,
  CircularProgress,
  Alert
} from '@mui/material';
import { Send as SendIcon, Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [openNewChat, setOpenNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`http://localhost:5000/api/messages/conversations/${user.user_id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        const data = await response.json();
        setConversations(data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError('Failed to load conversations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return;

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`http://localhost:5000/api/messages/conversation/${selectedConversation.conversation_id}/messages`);
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        setMessages(data);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const receiverId = selectedConversation.user1_id === user.user_id
        ? selectedConversation.user2_id
        : selectedConversation.user1_id;

      const response = await fetch('http://localhost:5000/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: user.user_id,
          receiver_id: receiverId,
          content: newMessage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setMessages([...messages, data]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleOpenNewChat = () => {
    setOpenNewChat(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCloseNewChat = () => {
    setOpenNewChat(false);
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/search?q=${searchQuery}`);
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      const data = await response.json();
      // Filter out the current user
      const filteredData = data.filter(userData => userData.user_id !== user.user_id);
      setSearchResults(filteredData);
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users. Please try again.');
    }
  };

  const handleStartConversation = async (selectedUser) => {
    try {
      // Check if conversation already exists
      const existingConversation = conversations.find(
        conv => (conv.user1_id === user.user_id && conv.user2_id === selectedUser.user_id) ||
                (conv.user1_id === selectedUser.user_id && conv.user2_id === user.user_id)
      );

      if (existingConversation) {
        setSelectedConversation(existingConversation);
        setOpenNewChat(false);
        return;
      }

      // Create a new conversation
      const response = await fetch('http://localhost:5000/api/messages/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user1_id: user.user_id,
          user2_id: selectedUser.user_id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      
      // Add the new conversation to the list
      setConversations([data, ...conversations]);
      setSelectedConversation(data);
      setOpenNewChat(false);
    } catch (error) {
      console.error('Error starting conversation:', error);
      setError('Failed to start conversation. Please try again.');
    }
  };

  const formatMessageTime = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  };

  if (loading && conversations.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ display: 'flex', height: '80vh' }}>
        {/* Conversations List */}
        <Box sx={{ width: '30%', borderRight: 1, borderColor: 'divider' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Conversations
            </Typography>
            <IconButton color="primary" onClick={handleOpenNewChat}>
              <AddIcon />
            </IconButton>
          </Box>
          <Divider />
          <List sx={{ overflow: 'auto', maxHeight: 'calc(80vh - 64px)' }}>
            {conversations.length > 0 ? (
              conversations.map((conv) => (
                <ListItem
                  key={conv.conversation_id}
                  button
                  selected={selectedConversation?.conversation_id === conv.conversation_id}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <ListItemAvatar>
                    <Avatar src={conv.other_profile_picture} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={conv.other_username}
                    secondary={formatMessageTime(conv.last_message_at)}
                  />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No conversations yet" />
              </ListItem>
            )}
          </List>
        </Box>

        {/* Messages */}
        <Box sx={{ width: '70%', display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              <Typography variant="h6" sx={{ p: 2 }}>
                Chat with {selectedConversation.other_username}
              </Typography>
              <Divider />
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box sx={{ p: 2 }}>
                  <Alert severity="error">{error}</Alert>
                </Box>
              ) : (
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                  {messages.length > 0 ? (
                    messages.map((message) => (
                      <Box
                        key={message.message_id}
                        sx={{
                          display: 'flex',
                          justifyContent: message.sender_id === user.user_id ? 'flex-end' : 'flex-start',
                          mb: 2
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '70%',
                            backgroundColor: message.sender_id === user.user_id ? 'primary.main' : 'grey.200',
                            color: message.sender_id === user.user_id ? 'white' : 'text.primary',
                            borderRadius: 2,
                            p: 2
                          }}
                        >
                          <Typography variant="body1">{message.content}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                            {formatMessageTime(message.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography variant="body1" color="text.secondary">
                        No messages yet. Start the conversation!
                      </Typography>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </Box>
              )}
              <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}
            >
              <Typography variant="h6" color="text.secondary">
                Select a conversation to start chatting
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* New Chat Dialog */}
      <Dialog open={openNewChat} onClose={handleCloseNewChat} fullWidth maxWidth="sm">
        <DialogTitle>Start a New Conversation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Search Users"
            fullWidth
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSearchUsers}>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <List sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <ListItemButton key={user.user_id} onClick={() => handleStartConversation(user)}>
                  <ListItemAvatar>
                    <Avatar src={user.profile_picture_url} />
                  </ListItemAvatar>
                  <ListItemText primary={user.username} secondary={user.full_name} />
                </ListItemButton>
              ))
            ) : searchQuery.trim() ? (
              <ListItem>
                <ListItemText primary="No users found" />
              </ListItem>
            ) : (
              <ListItem>
                <ListItemText primary="Type to search users" />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewChat}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Messages; 