import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import Feed from './Feed';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const feedRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to scroll to top and refresh feed
  const scrollToTopAndRefresh = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Increment refreshKey to force Feed component to re-render
    setRefreshKey(prevKey => prevKey + 1);
    
    // Call the refresh method on the Feed component
    if (feedRef.current) {
      feedRef.current.refresh();
    }
  };

  // Listen for location changes to detect when user navigates to home
  useEffect(() => {
    if (location.pathname === '/') {
      scrollToTopAndRefresh();
    }
  }, [location.pathname]);

  // Listen for the custom refreshHome event
  useEffect(() => {
    const handleRefreshHome = () => {
      scrollToTopAndRefresh();
    };

    window.addEventListener('refreshHome', handleRefreshHome);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('refreshHome', handleRefreshHome);
    };
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {isAuthenticated ? (
        <Feed key={refreshKey} ref={feedRef} />
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to Social Media App
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Please login or register to view and interact with posts.
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Home; 