const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  blockUserController,
  unblockUserController,
  getBlockedUsersController
} = require('../controllers/Blocks.controller');

// All block routes require authentication
router.use(authMiddleware);

// Blocks routes
router.post('/:blockedId', blockUserController);
router.delete('/:blockedId', unblockUserController);
router.get('/', getBlockedUsersController);

module.exports = router;
