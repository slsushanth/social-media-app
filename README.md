# Social Media Application

A full-stack social media application built with React, Node.js, and MySQL.

## Features

- User authentication and authorization
- Create, read, update, and delete posts
- Like and comment on posts
- User profiles
- Real-time notifications
- Image uploads
- Follow/unfollow users

## Tech Stack

- Frontend: React, Material-UI
- Backend: Node.js, Express
- Database: MySQL
- Authentication: JWT
- File Storage: Local file system

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/yourusername/social-media-app.git
cd social-media-app
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up the database:
- Create a MySQL database
- Import the database schema from `backend/setup_database.js`

4. Configure environment variables:
- Copy `.env.example` to `.env` in the backend directory
- Fill in your database credentials and other configuration values

5. Start the development servers:
```bash
# Start backend server
cd backend
npm start

# Start frontend server
cd ../frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Project Structure

```
social-media-app/
├── frontend/              # React frontend
│   ├── public/           # Static files
│   └── src/              # Source files
│       ├── components/   # React components
│       ├── context/      # Context providers
│       └── utils/        # Utility functions
├── backend/              # Node.js backend
│   ├── routes/          # API routes
│   ├── middleware/      # Middleware functions
│   └── uploads/         # Uploaded files
└── README.md            # Project documentation
```

## API Documentation

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user

### Posts
- GET /api/posts - Get all posts
- POST /api/posts - Create a new post
- GET /api/posts/:id - Get a single post
- PUT /api/posts/:id - Update a post
- DELETE /api/posts/:id - Delete a post
- POST /api/posts/:id/like - Like a post
- DELETE /api/posts/:id/like - Unlike a post

### Comments
- GET /api/comments/post/:postId - Get comments for a post
- POST /api/comments - Create a new comment
- PUT /api/comments/:id - Update a comment
- DELETE /api/comments/:id - Delete a comment

### Users
- GET /api/users/:id - Get user profile
- PUT /api/users/:id - Update user profile
- POST /api/users/:id/follow - Follow a user
- DELETE /api/users/:id/follow - Unfollow a user

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 