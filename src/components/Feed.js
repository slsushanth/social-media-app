import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  CardActions,
  Avatar,
  IconButton,
  Typography,
  TextField,
  Button,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip
} from '@mui/material';
import { 
  Favorite, 
  FavoriteBorder, 
  Comment, 
  Share,
  Send,
  Image as ImageIcon,
  Close,
  WhatsApp,
  Facebook,
  Twitter,
  Instagram,
  Delete,
  MoreVert,
  Info
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const Feed = forwardRef((props, ref) => {
  const { user, getToken } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [comments, setComments] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [imageDialog, setImageDialog] = useState({ open: false, imageUrl: '' });
  const [imagePreview, setImagePreview] = useState(null);
  const [shareMenuAnchor, setShareMenuAnchor] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postMenuAnchor, setPostMenuAnchor] = useState(null);
  const [showComments, setShowComments] = useState({});

  // Fetch posts from the backend
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch('http://localhost:5000/api/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const data = await response.json();
      
      // Transform the data to match our component's expected format
      const formattedPosts = data.map(post => ({
        id: post.post_id,
        user: {
          id: post.user_id,
          name: post.username,
          avatar: post.profile_picture_url || 'https://randomuser.me/api/portraits/men/32.jpg'
        },
        content: post.content,
        image: post.image_url,
        likes: post.like_count || 0,
        comments: [],
        timestamp: new Date(post.created_at),
        isOwnPost: user && user.user_id === post.user_id
      }));
      
      setPosts(formattedPosts);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again later.');
      setLoading(false);
    }
  }, [user, getToken]);

  // Expose the refresh method to parent components
  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchPosts();
    }
  }));

  // Fetch comments for a post
  const fetchComments = async (postId) => {
    try {
      const token = getToken();
      
      const response = await fetch(`http://localhost:5000/api/comments/post/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      const comments = await response.json();
      
      // Update the post with comments
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                comments: comments.map(comment => ({
                  id: comment.comment_id,
                  user: { 
                    id: comment.user_id,
                    name: comment.username,
                    avatar: comment.profile_picture_url || 'https://randomuser.me/api/portraits/men/32.jpg'
                  },
                  content: comment.content,
                  timestamp: new Date(comment.created_at)
                }))
              }
            : post
        )
      );
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Add event listener for post creation
  useEffect(() => {
    const handlePostCreated = () => {
      fetchPosts();
    };
    
    window.addEventListener('postCreated', handlePostCreated);
    
    return () => {
      window.removeEventListener('postCreated', handlePostCreated);
    };
  }, [fetchPosts]);

  // Fetch comments when a post's comments are toggled
  useEffect(() => {
    // For each post that has showComments set to true, fetch its comments
    Object.entries(showComments).forEach(([postId, isShown]) => {
      if (isShown) {
        fetchComments(parseInt(postId));
      }
    });
  }, [showComments]);

  const handleLike = async (postId) => {
    try {
      // Get the current user from localStorage
      const userData = JSON.parse(localStorage.getItem('user'));
      if (!userData || !userData.user_id) {
        setSnackbar({ open: true, message: 'You must be logged in to like a post', severity: 'error' });
        return;
      }

      const isLiked = likedPosts[postId];
      const token = getToken();
      
      // Make API call to like/unlike post
      const response = await fetch(`http://localhost:5000/api/posts/${postId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userData.user_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update like');
      }

      // Update the UI
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              likes: isLiked ? post.likes - 1 : post.likes + 1,
              is_liked: !isLiked
            }
          : post
      ));
      setLikedPosts({ ...likedPosts, [postId]: !isLiked });
    } catch (error) {
      console.error('Error updating like:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to update like', severity: 'error' });
    }
  };

  const handleComment = async (postId) => {
    if (comments[postId]?.trim()) {
      try {
        // Get the current user from localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData || !userData.user_id) {
          setSnackbar({ open: true, message: 'You must be logged in to comment', severity: 'error' });
          return;
        }

        const token = getToken();
        
        // Make API call to add comment
        const response = await fetch('http://localhost:5000/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            post_id: postId,
            user_id: userData.user_id,
            content: comments[postId]
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add comment');
        }

        const newComment = await response.json();
        
        // Update the UI
        setPosts(posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                comments: [...post.comments, newComment],
                commentCount: (post.commentCount || 0) + 1
              }
            : post
        ));
        
        // Clear the comment input
        setComments({ ...comments, [postId]: '' });
      } catch (error) {
        console.error('Error adding comment:', error);
        setSnackbar({ open: true, message: error.message || 'Failed to add comment', severity: 'error' });
      }
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const token = getToken();
        const uploadResponse = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
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
        setSnackbar({ open: true, message: 'Failed to upload image', severity: 'error' });
      }
    }
  };

  const handleNewPost = async () => {
    if (newPost.trim() || imagePreview) {
      try {
        if (!user) {
          setSnackbar({ open: true, message: 'You must be logged in to create a post', severity: 'error' });
          return;
        }

        // Prepare the post data
        const postData = {
          user_id: user.user_id,
          content: newPost.trim() || ' ',
          image_url: imagePreview || null
        };
        
        console.log('Sending post data:', postData);

        const token = getToken();
        
        // Make API call to create post
        const response = await fetch('http://localhost:5000/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(postData),
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          throw new Error(errorData.error || 'Failed to create post');
        }

        const createdPost = await response.json();
        console.log('Created post:', createdPost);
        
        // Add the new post to the state
        setPosts([{
          id: createdPost.post_id,
          user: {
            id: createdPost.user_id,
            name: user.username || user.full_name,
            avatar: user.profile_picture_url || 'https://randomuser.me/api/portraits/men/32.jpg'
          },
          content: createdPost.content,
          image: createdPost.image_url,
          likes: 0,
          comments: [],
          timestamp: new Date(createdPost.created_at),
          isOwnPost: true
        }, ...posts]);
        
        // Reset the form
        setNewPost('');
        setImagePreview(null);
        
        // Show success message
        setSnackbar({ open: true, message: 'Post created successfully!', severity: 'success' });
      } catch (error) {
        console.error('Error creating post:', error);
        setSnackbar({ open: true, message: error.message || 'Failed to create post', severity: 'error' });
      }
    }
  };

  const handleImageClick = (imageUrl) => {
    setImageDialog({ open: true, imageUrl });
  };

  const handleCloseImageDialog = () => {
    setImageDialog({ open: false, imageUrl: '' });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleShareClick = (event, postId) => {
    setShareMenuAnchor(event.currentTarget);
    setSelectedPost(postId);
  };

  const handleShareClose = () => {
    setShareMenuAnchor(null);
    setSelectedPost(null);
  };

  const handlePostMenuClick = (event, postId) => {
    setPostMenuAnchor(event.currentTarget);
    setSelectedPost(postId);
  };

  const handlePostMenuClose = () => {
    setPostMenuAnchor(null);
    setSelectedPost(null);
  };

  const handleDeletePost = async (postId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      if (!userData || !userData.user_id) {
        setSnackbar({ open: true, message: 'You must be logged in to delete a post', severity: 'error' });
        return;
      }

      const token = getToken();
      
      const response = await fetch(`http://localhost:5000/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      // Remove the post from the state
      setPosts(posts.filter(post => post.id !== postId));
      
      // Close the menu
      handlePostMenuClose();
      
      // Show success message
      setSnackbar({ open: true, message: 'Post deleted successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error deleting post:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to delete post', severity: 'error' });
    }
  };

  const handleShare = (platform) => {
    const post = posts.find(p => p.id === selectedPost);
    if (!post) return;

    const shareUrl = window.location.origin;
    const shareText = `Check out this post: ${post.content}`;
    
    let shareLink = '';
    
    switch (platform) {
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'instagram':
        // Instagram doesn't have a direct share URL, so we'll just copy to clipboard
        navigator.clipboard.writeText(shareText + ' ' + shareUrl);
        setSnackbar({ open: true, message: 'Link copied to clipboard! Share it on Instagram', severity: 'info' });
        return;
      default:
        return;
    }
    
    window.open(shareLink, '_blank');
    handleShareClose();
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Avatar 
              alt="User Avatar" 
              src={user?.profile_picture_url || "https://randomuser.me/api/portraits/men/32.jpg"}
              sx={{ width: 48, height: 48, mr: 2, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="What's on your mind?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                },
              }}
            />
          </Box>
          
          {imagePreview && (
            <Box sx={{ mt: 2, position: 'relative', display: 'inline-block', width: '100%' }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  maxHeight: '200px', 
                  maxWidth: '100%', 
                  objectFit: 'contain',
                  borderRadius: '12px'
                }} 
                onError={(e) => {
                  console.error('Preview image failed to load:', e.target.src);
                  e.target.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
                }}
              />
              <IconButton 
                size="small" 
                sx={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8, 
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,1)' },
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
                onClick={() => setImagePreview(null)}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          )}
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<ImageIcon />}
              sx={{ 
                borderRadius: 3,
                textTransform: 'none',
                px: 3
              }}
            >
              Add Image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageUpload}
              />
            </Button>
            
            <Button 
              variant="contained" 
              onClick={handleNewPost}
              disabled={!newPost.trim() && !imagePreview}
              sx={{ 
                borderRadius: 3,
                textTransform: 'none',
                px: 4,
                py: 1
              }}
            >
              Post
            </Button>
          </Box>
        </CardContent>
      </Card>

      {posts.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No posts yet. Be the first to post!
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<ImageIcon />}
            onClick={() => document.querySelector('textarea').focus()}
            sx={{ 
              borderRadius: 3,
              textTransform: 'none',
              px: 4
            }}
          >
            Create Post
          </Button>
        </Card>
      ) : (
        posts.map(post => (
          <Card key={post.id} sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
            <CardHeader
              avatar={
                <Avatar 
                  src={post.user.avatar} 
                  alt={post.user.name} 
                  sx={{ 
                    width: 48, 
                    height: 48, 
                    border: '2px solid #fff', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
                  }}
                />
              }
              title={
                <Typography variant="subtitle1" fontWeight="600">
                  {post.user.name}
                </Typography>
              }
              subheader={
                <Typography variant="caption" color="text.secondary">
                  {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                </Typography>
              }
              action={
                post.isOwnPost && (
                  <IconButton 
                    aria-label="post options" 
                    onClick={(e) => handlePostMenuClick(e, post.id)}
                  >
                    <MoreVert />
                  </IconButton>
                )
              }
              sx={{ pb: 1 }}
            />
            {post.image && (
              <Box 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.9 },
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  backgroundColor: '#f8f9fa',
                  p: 1
                }}
                onClick={() => handleImageClick(post.image)}
              >
                <img
                  src={post.image}
                  alt="Post content"
                  style={{ 
                    width: '100%', 
                    maxHeight: '500px', 
                    objectFit: 'contain',
                    borderRadius: '12px'
                  }}
                  onError={(e) => {
                    console.error('Image failed to load:', e.target.src);
                    e.target.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
                  }}
                />
              </Box>
            )}
            <CardContent sx={{ pt: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {post.content}
              </Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button 
                startIcon={likedPosts[post.id] ? <Favorite color="secondary" /> : <FavoriteBorder />}
                onClick={() => handleLike(post.id)}
                sx={{ 
                  color: likedPosts[post.id] ? 'secondary.main' : 'text.secondary',
                  textTransform: 'none',
                  fontWeight: likedPosts[post.id] ? 600 : 400
                }}
              >
                {post.likes} {post.likes === 1 ? 'Like' : 'Likes'}
                {post.liked_by_users && (
                  <Tooltip title={`Liked by: ${post.liked_by_users}`}>
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <Info fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Button>
              <Button 
                startIcon={<Comment />}
                onClick={() => toggleComments(post.id)}
                sx={{ 
                  color: 'text.secondary',
                  textTransform: 'none'
                }}
              >
                Comment
              </Button>
              <Button 
                startIcon={<Share />}
                onClick={(e) => handleShareClick(e, post.id)}
                sx={{ 
                  color: 'text.secondary',
                  textTransform: 'none'
                }}
              >
                Share
              </Button>
            </CardActions>
            
            {showComments[post.id] && (
              <Box sx={{ px: 3, pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    alt="User Avatar" 
                    src={user?.profile_picture_url || "https://randomuser.me/api/portraits/men/32.jpg"}
                    sx={{ width: 32, height: 32, mr: 2 }}
                  />
                  <TextField
                    fullWidth
                    placeholder="Write a comment..."
                    variant="outlined"
                    size="small"
                    value={comments[post.id] || ''}
                    onChange={(e) => setComments({ ...comments, [post.id]: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      },
                    }}
                  />
                  <IconButton 
                    color="primary" 
                    sx={{ ml: 1 }}
                    onClick={() => handleComment(post.id)}
                    disabled={!comments[post.id]?.trim()}
                  >
                    <Send />
                  </IconButton>
                </Box>
                
                {post.comments && post.comments.length > 0 ? (
                  <Box sx={{ pl: 4 }}>
                    {post.comments.map((comment, index) => (
                      <Box key={comment.id || index} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="600">
                          {comment.user.name}
                        </Typography>
                        <Typography variant="body2">
                          {comment.content}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ pl: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No comments yet. Be the first to comment!
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Card>
        ))
      )}
      
      <Dialog
        open={imageDialog.open}
        onClose={handleCloseImageDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <IconButton
            aria-label="close"
            onClick={handleCloseImageDialog}
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
        <DialogContent sx={{ p: 0 }}>
          <img
            src={imageDialog.imageUrl}
            alt="Full size"
            style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseImageDialog} sx={{ borderRadius: 3 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      <Menu
        anchorEl={shareMenuAnchor}
        open={Boolean(shareMenuAnchor)}
        onClose={handleShareClose}
        PaperProps={{
          elevation: 3,
          sx: { 
            minWidth: 180,
            borderRadius: 2
          }
        }}
      >
        <MenuItem onClick={() => handleShare('whatsapp')}>
          <ListItemIcon>
            <WhatsApp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share on WhatsApp</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleShare('facebook')}>
          <ListItemIcon>
            <Facebook fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share on Facebook</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleShare('twitter')}>
          <ListItemIcon>
            <Twitter fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share on Twitter</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleShare('instagram')}>
          <ListItemIcon>
            <Instagram fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share on Instagram</ListItemText>
        </MenuItem>
      </Menu>
      
      <Menu
        anchorEl={postMenuAnchor}
        open={Boolean(postMenuAnchor)}
        onClose={handlePostMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { 
            minWidth: 180,
            borderRadius: 2
          }
        }}
      >
        <MenuItem onClick={() => handleDeletePost(selectedPost)}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Post</ListItemText>
        </MenuItem>
      </Menu>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%', borderRadius: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
});

Feed.displayName = 'Feed';

export default Feed; 