import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Avatar, 
  Box, 
  Grid, 
  Button, 
  Divider,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
  Badge,
  Tooltip
} from '@mui/material';
import { 
  Edit, 
  Favorite, 
  FavoriteBorder, 
  Comment, 
  Share,
  Send,
  PhotoCamera,
  LocationOn,
  Link as LinkIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser, getToken } = useAuth();
  const [user, setUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    bio: '',
    profilePictureUrl: ''
  });
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showComments, setShowComments] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = getToken();
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        // Fetch user data
        const userResponse = await fetch(`http://localhost:5000/api/users/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data');
        }
        const userData = await userResponse.json();
        setUser(userData);
        
        // Initialize edit form with user data
        setEditForm({
          fullName: userData.full_name,
          bio: userData.bio || '',
          profilePictureUrl: userData.profile_picture_url || ''
        });

        // Fetch user posts
        const postsResponse = await fetch(`http://localhost:5000/api/posts/user/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!postsResponse.ok) {
          throw new Error('Failed to fetch user posts');
        }
        const postsData = await postsResponse.json();
        setUserPosts(postsData);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id, getToken]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setError(null);

      const formData = new FormData();
      formData.append('image', file);

      // Upload the image first
      const uploadResponse = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const { imageUrl } = await uploadResponse.json();

      // Update user profile with new image URL while preserving existing data
      const updateResponse = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          full_name: user.full_name || '',
          bio: user.bio || '',
          profile_picture_url: imageUrl
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || 'Failed to update profile picture');
      }

      const updatedUser = await updateResponse.json();
      
      // Update both the user state and edit form
      setUser(prevUser => ({
        ...prevUser,
        ...updatedUser
      }));
      
      setEditForm(prev => ({
        ...prev,
        profilePictureUrl: imageUrl
      }));

      // Clear any existing errors
      setError(null);
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setError(err.message || 'Failed to update profile picture');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!editForm.fullName.trim()) {
        setError('Full name is required');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          full_name: editForm.fullName.trim(),
          bio: editForm.bio.trim() || '',
          profile_picture_url: user.profile_picture_url || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      setUser(prevUser => ({
        ...prevUser,
        ...updatedUser
      }));
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setEditForm({
      fullName: user.full_name,
      bio: user.bio || '',
      profilePictureUrl: user.profile_picture_url || ''
    });
    setIsEditing(false);
  };

  const handleLike = async (postId) => {
    try {
      const isLiked = userPosts.find(post => post.post_id === postId)?.is_liked;
      const token = getToken();
      
      const response = await fetch(`http://localhost:5000/api/posts/${postId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: currentUser.user_id }),
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      // Update the post in the state
      setUserPosts(userPosts.map(post => {
        if (post.post_id === postId) {
          return {
            ...post,
            is_liked: !isLiked,
            like_count: isLiked ? post.like_count - 1 : post.like_count + 1
          };
        }
        return post;
      }));
    } catch (err) {
      console.error('Error liking post:', err);
      setError(err.message);
    }
  };

  const handleComment = async (postId) => {
    if (!comments[postId]?.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          post_id: postId,
          user_id: currentUser.user_id,
          content: comments[postId]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const newComment = await response.json();
      
      // Update the post in the state
      setUserPosts(userPosts.map(post => {
        if (post.post_id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), newComment],
            comment_count: (post.comment_count || 0) + 1
          };
        }
        return post;
      }));
      
      setComments({ ...comments, [postId]: '' });
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err.message);
    }
  };

  const toggleComments = (postId) => {
    setShowComments({
      ...showComments,
      [postId]: !showComments[postId]
    });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container>
        <Alert severity="info" sx={{ mt: 4 }}>
          User not found
        </Alert>
      </Container>
    );
  }

  const isOwnProfile = currentUser?.user_id === parseInt(id);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box position="relative">
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                currentUser?.user_id === parseInt(id) && (
                  <label htmlFor="profile-picture-upload">
                    <input
                      accept="image/*"
                      id="profile-picture-upload"
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleProfilePictureUpload}
                      disabled={uploadingPhoto}
                    />
                    <IconButton
                      component="span"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                      disabled={uploadingPhoto}
                    >
                      <PhotoCamera />
                    </IconButton>
                  </label>
                )
              }
            >
              <Avatar
                src={user.profile_picture_url}
                alt={user.full_name}
                sx={{ width: 120, height: 120, mr: 3, border: '3px solid #f0f0f0' }}
              />
            </Badge>
            {uploadingPhoto && (
              <CircularProgress
                size={24}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  zIndex: 1,
                }}
              />
            )}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              {user.full_name}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              @{user.username}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
              {user.bio || 'No bio yet'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                <strong>{userPosts.length}</strong> posts
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                <strong>{user.followers_count || 0}</strong> followers
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                <strong>{user.following_count || 0}</strong> following
              </Typography>
            </Box>
          </Box>
          {isOwnProfile ? (
            <Button 
              variant="outlined" 
              startIcon={<Edit />}
              onClick={handleEdit}
              sx={{ borderRadius: 2 }}
            >
              Edit Profile
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="primary"
              sx={{ borderRadius: 2 }}
            >
              Follow
            </Button>
          )}
        </Box>

        {isEditing && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Edit Profile</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  multiline
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Profile Picture URL"
                  value={editForm.profilePictureUrl}
                  onChange={(e) => setEditForm({ ...editForm, profilePictureUrl: e.target.value })}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={handleCancel} sx={{ borderRadius: 2 }}>
                    Cancel
                  </Button>
                  <Button variant="contained" onClick={handleSave} sx={{ borderRadius: 2 }}>
                    Save Changes
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      <Paper sx={{ mb: 4, borderRadius: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          centered
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Posts" />
          <Tab label="About" />
          <Tab label="Photos" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <>
          {userPosts.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <PhotoCamera sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No posts yet
              </Typography>
              {isOwnProfile && (
                <Typography variant="body2" color="text.secondary">
                  When you share photos, they will appear on your profile.
                </Typography>
              )}
            </Paper>
          ) : (
            userPosts.map(post => (
              <Card key={post.post_id} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
                <CardHeader
                  avatar={
                    <Avatar src={user.profile_picture_url} alt={user.full_name} />
                  }
                  title={
                    <Typography variant="subtitle1" fontWeight="bold">
                      {user.full_name}
                    </Typography>
                  }
                  subheader={
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </Typography>
                  }
                />
                {post.image_url && (
                  <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                    <img
                      src={post.image_url}
                      alt="Post content"
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                    />
                  </Box>
                )}
                <CardContent>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {post.content}
                  </Typography>
                </CardContent>
                <CardActions disableSpacing>
                  <IconButton onClick={() => handleLike(post.post_id)}>
                    {post.is_liked ? <Favorite color="error" /> : <FavoriteBorder />}
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    {post.like_count || 0} likes
                    {post.liked_by_users && (
                      <Tooltip title={`Liked by: ${post.liked_by_users}`}>
                        <IconButton size="small" sx={{ ml: 1 }}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Typography>
                  <IconButton onClick={() => toggleComments(post.post_id)}>
                    <Comment />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    {post.comment_count || 0} comments
                  </Typography>
                  <IconButton>
                    <Share />
                  </IconButton>
                </CardActions>
                {showComments[post.post_id] && (
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <TextField
                        size="small"
                        placeholder="Write a comment..."
                        value={comments[post.post_id] || ''}
                        onChange={(e) => setComments({ ...comments, [post.post_id]: e.target.value })}
                        fullWidth
                        variant="outlined"
                      />
                      <IconButton 
                        onClick={() => handleComment(post.post_id)}
                        disabled={!comments[post.post_id]?.trim()}
                        color="primary"
                      >
                        <Send />
                      </IconButton>
                    </Box>
                    {post.comments?.length > 0 ? (
                      post.comments.map(comment => (
                        <Box key={comment.comment_id} sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {comment.username}
                          </Typography>
                          <Typography variant="body2">
                            {comment.content}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No comments yet
                      </Typography>
                    )}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>About {user.full_name}</Typography>
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Bio</Typography>
            <Typography variant="body1">{user.bio || 'No bio available'}</Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Joined</Typography>
            <Typography variant="body1">
              {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Stats</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h6">{userPosts.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Posts</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h6">{user.followers_count || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Followers</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Photos</Typography>
          <Divider sx={{ my: 2 }} />
          
          {userPosts.filter(post => post.image_url).length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PhotoCamera sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No photos yet
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {userPosts.filter(post => post.image_url).map(post => (
                <Grid item xs={4} key={post.post_id}>
                  <Box 
                    sx={{ 
                      position: 'relative', 
                      paddingTop: '100%',
                      borderRadius: 1,
                      overflow: 'hidden',
                      '&:hover': {
                        opacity: 0.9
                      }
                    }}
                  >
                    <img
                      src={post.image_url}
                      alt="Post content"
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default Profile; 