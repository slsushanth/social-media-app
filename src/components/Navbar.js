import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Avatar,
  Menu,
  MenuItem,
  Box,
  Badge,
  InputBase,
  Paper,
  Tooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Home,
  Notifications,
  Search,
  Message,
  Person,
  Settings,
  Logout,
  Add as AddIcon,
  AccountCircle,
  Image as ImageIcon,
  Close
} from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { styled, alpha } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import SettingsDialog from './Settings';

// Styled search component
const SearchBar = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const isHomePage = location.pathname === '/';
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch unread counts
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!user) return;

      try {
        // Fetch unread notifications count
        const notifResponse = await fetch(`http://localhost:5000/api/notifications/${user.user_id}/unread`);
        const notifData = await notifResponse.json();
        setUnreadNotifications(notifData.count);

        // TODO: Implement unread messages count endpoint
        // For now, we'll just show a static number
        setUnreadMessages(2);
      } catch (error) {
        console.error('Error fetching unread counts:', error);
      }
    };

    if (isAuthenticated) {
      fetchUnreadCounts();
    }
  }, [isAuthenticated, user]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/');
  };

  const handleCreatePostClick = () => {
    setCreatePostOpen(true);
  };

  const handleCloseCreatePost = () => {
    setCreatePostOpen(false);
    setNewPost('');
    setImagePreview(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const uploadResponse = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const data = await uploadResponse.json();
        setImagePreview(data.imageUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
  };

  const handleCreatePost = async () => {
    if (newPost.trim() || imagePreview) {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData || !userData.user_id) {
          return;
        }

        const postData = {
          user_id: userData.user_id,
          content: newPost.trim() || ' ',
          image_url: imagePreview || null
        };

        const response = await fetch('http://localhost:5000/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(postData),
        });

        if (!response.ok) {
          throw new Error('Failed to create post');
        }

        // Close the dialog and reset form
        handleCloseCreatePost();
        
        // Show success message
        alert('Post created successfully!');
        
        // Dispatch a custom event to notify that a new post was created
        const event = new CustomEvent('postCreated');
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Error creating post:', error);
        alert('Failed to create post. Please try again.');
      }
    }
  };

  const handleHomeClick = (e) => {
    if (isHomePage) {
      // If already on home page, prevent default navigation and trigger a refresh
      e.preventDefault();
      
      // Dispatch a custom event that Home component can listen for
      window.dispatchEvent(new CustomEvent('refreshHome'));
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  return (
    <>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar sx={{ py: 1 }}>
          <Typography
            variant="h5"
            component={Link}
            to="/"
            sx={{ 
              flexGrow: 0, 
              textDecoration: 'none', 
              color: 'inherit',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              mr: 3
            }}
          >
            <Box component="span" sx={{ color: 'secondary.main', mr: 0.5 }}>Social</Box>Connect
          </Typography>

          {isAuthenticated ? (
            <>
              <SearchBar>
                <SearchIconWrapper>
                  <Search />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search…"
                  inputProps={{ 'aria-label': 'search' }}
                />
              </SearchBar>

              <Box sx={{ flexGrow: 1 }} />

              <Tooltip title="Home">
                <IconButton 
                  color="inherit" 
                  component={Link} 
                  to="/"
                  onClick={handleHomeClick}
                  sx={{ 
                    backgroundColor: isHomePage ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                  }}
                >
                  <Home />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Messages">
                <IconButton 
                  color="inherit"
                  component={Link}
                  to="/messages"
                >
                  <Badge badgeContent={unreadMessages} color="secondary">
                    <Message />
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Notifications">
                <IconButton 
                  color="inherit"
                  component={Link}
                  to="/notifications"
                >
                  <Badge badgeContent={unreadNotifications} color="secondary">
                    <Notifications />
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Create Post">
                <IconButton 
                  color="inherit"
                  onClick={handleCreatePostClick}
                  sx={{ 
                    backgroundColor: 'secondary.main',
                    '&:hover': { backgroundColor: 'secondary.dark' }
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Settings">
                <IconButton
                  onClick={handleSettingsClick}
                  color="inherit"
                >
                  <Settings />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Profile">
                <IconButton
                  onClick={handleMenu}
                  color="inherit"
                  sx={{ ml: 1 }}
                >
                  <Avatar 
                    alt={user?.username || 'User Avatar'} 
                    src={user?.profile_picture_url || "https://randomuser.me/api/portraits/men/32.jpg"}
                    sx={{ width: 36, height: 36, border: '2px solid white' }}
                  >
                    <AccountCircle />
                  </Avatar>
                </IconButton>
              </Tooltip>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                  elevation: 3,
                  sx: { 
                    mt: 1.5,
                    minWidth: 180,
                    borderRadius: 2
                  }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem 
                  component={Link} 
                  to={`/profile/${user?.user_id}`} 
                  onClick={handleClose}
                  sx={{ py: 1 }}
                >
                  <Person sx={{ mr: 2 }} /> Profile
                </MenuItem>
                <MenuItem onClick={handleClose} sx={{ py: 1 }}>
                  <Settings /> Settings
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ py: 1 }}>
                  <Logout sx={{ mr: 2 }} /> Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                color="inherit"
                component={Link}
                to="/login"
                sx={{ 
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                }}
              >
                Login
              </Button>
              <Button
                variant="contained"
                color="secondary"
                component={Link}
                to="/register"
                sx={{ 
                  '&:hover': { backgroundColor: 'secondary.dark' }
                }}
              >
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Dialog 
        open={createPostOpen} 
        onClose={handleCloseCreatePost}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Create Post
          <IconButton
            aria-label="close"
            onClick={handleCloseCreatePost}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'grey.500',
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="What's on your mind?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            {imagePreview && (
              <Box sx={{ position: 'relative', mb: 2 }}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    maxHeight: '200px', 
                    maxWidth: '100%', 
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }} 
                />
                <IconButton 
                  size="small" 
                  onClick={() => setImagePreview(null)}
                  sx={{ 
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            )}
            <Button
              component="label"
              variant="outlined"
              startIcon={<ImageIcon />}
              fullWidth
              sx={{ mb: 2 }}
            >
              Add Image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageUpload}
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreatePost}>Cancel</Button>
          <Button 
            onClick={handleCreatePost}
            variant="contained"
            disabled={!newPost.trim() && !imagePreview}
          >
            Post
          </Button>
        </DialogActions>
      </Dialog>
      <SettingsDialog open={settingsOpen} onClose={handleSettingsClose} />
    </>
  );
};

export default Navbar; 