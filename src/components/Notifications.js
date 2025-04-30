import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  IconButton,
  Box,
  Badge,
  Divider
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/notifications/${user.user_id}`);
        const data = await response.json();
        setNotifications(data);
        
        // Count unread notifications
        const unread = data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Mark notifications as read
  const handleMarkAsRead = async () => {
    try {
      await fetch('http://localhost:5000/api/notifications/read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.user_id
        }),
      });

      // Update local state
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <FavoriteIcon color="error" />;
      case 'comment':
        return <CommentIcon color="primary" />;
      case 'follow':
        return <PersonIcon color="success" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification) => {
    switch (notification.type) {
      case 'like':
        return `${notification.actor_username} liked your post: "${notification.content}"`;
      case 'comment':
        return `${notification.actor_username} commented on your post: "${notification.content}"`;
      case 'follow':
        return `${notification.actor_username} started following you`;
      default:
        return 'New notification';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Notifications
            {unreadCount > 0 && (
              <Badge
                badgeContent={unreadCount}
                color="error"
                sx={{ ml: 2 }}
              />
            )}
          </Typography>
          {unreadCount > 0 && (
            <IconButton onClick={handleMarkAsRead} title="Mark all as read">
              <CheckCircleIcon />
            </IconButton>
          )}
        </Box>
        <Divider />
        <List sx={{ maxHeight: '70vh', overflow: 'auto' }}>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <React.Fragment key={notification.notification_id}>
                <ListItem
                  sx={{
                    backgroundColor: notification.is_read ? 'inherit' : 'action.hover',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar src={notification.actor_profile_picture}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={getNotificationText(notification)}
                    secondary={new Date(notification.created_at).toLocaleString()}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          ) : (
            <ListItem>
              <ListItemText
                primary={
                  <Typography align="center" color="text.secondary">
                    No notifications yet
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default Notifications; 