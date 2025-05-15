const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getMessagesController,
  deleteChatController
} = require('../controllers/Messages.controller');

// All message routes require authentication
router.use(authMiddleware);

// Messages routes
router.get('/:friendId', getMessagesController);
router.delete('/:friendId', deleteChatController);

module.exports = router;
