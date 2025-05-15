const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getFriendsListController,
  removeFriendController,
  getDashboardController
} = require('../controllers/Friends.controller');

// All friends routes require authentication
router.use(authMiddleware);

// Friends routes
router.get('/', getFriendsListController);
router.delete('/:friendId', removeFriendController);

// Dashboard route for home screen data
router.get('/dashboard', getDashboardController);

module.exports = router;
