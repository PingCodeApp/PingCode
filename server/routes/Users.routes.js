const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  signupController,
  loginController,
  getProfileController,
  updateProfileController
} = require('../controllers/Users.controller');

// Authentication routes
router.post('/signup', signupController);
router.post('/login', loginController);

// Protected profile routes
router.get('/profile', authMiddleware, getProfileController);
router.put('/profile', authMiddleware, updateProfileController);

module.exports = router;