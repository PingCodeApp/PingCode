const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  sendFriendRequestController,
  getPendingRequestsController,
  acceptFriendRequestController,
  declineFriendRequestController
} = require('../controllers/FriendRequests.controller');

// All friend request routes require authentication
router.use(authMiddleware);

// Friend request routes
router.post('/', sendFriendRequestController);
router.get('/', getPendingRequestsController);
router.post('/accept/:requestId', acceptFriendRequestController);
router.post('/decline/:requestId', declineFriendRequestController);

module.exports = router;
