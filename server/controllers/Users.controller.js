const { Users } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Generate a unique friend code
 * @returns {string} A unique 6-character alphanumeric friend code
 */
const generateFriendCode = async () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let friendCode;
  let isUnique = false;

  // Keep generating until we find a unique code
  while (!isUnique) {
    // Generate a random 3-letter prefix from the username or random letters
    const prefix = Array(3)
      .fill()
      .map(() => characters.charAt(Math.floor(Math.random() * 26)))
      .join('');

    // Generate a random 3-digit number
    const suffix = Array(3)
      .fill()
      .map(() => characters.charAt(26 + Math.floor(Math.random() * 10)))
      .join('');

    friendCode = prefix + suffix;

    // Check if this friend code already exists
    const existingUser = await Users.findOne({ where: { friend_code: friendCode } });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return friendCode;
};

/**
 * Controller for user signup
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const signupController = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if username already exists
    const existingUser = await Users.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Generate unique friend code
    const friendCode = await generateFriendCode();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = await Users.create({
      username,
      password: hashedPassword,
      friend_code: friendCode
    });

    // Create JWT token
    const token = jwt.sign(
      { userId: newUser.user_id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success with token and friend code
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        userId: newUser.user_id,
        username: newUser.username,
        friendCode: newUser.friend_code
      }
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

/**
 * Controller for user login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const loginController = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user by username
    const user = await Users.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.user_id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success with token
    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        friendCode: user.friend_code
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * Controller for getting user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getProfileController = async (req, res) => {
  try {
    // Get user ID from the authenticated request
    const userId = req.user.userId;

    // Find user by ID
    const user = await Users.findByPk(userId, {
      attributes: ['user_id', 'username', 'friend_code', 'profile_picture', 'created_at']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user profile
    res.json({
      userId: user.user_id,
      username: user.username,
      friendCode: user.friend_code,
      profilePicture: user.profile_picture,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ message: 'Server error while retrieving profile' });
  }
};

/**
 * Controller for updating user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProfileController = async (req, res) => {
  try {
    // Get user ID from the authenticated request
    const userId = req.user.userId;
    const { username, profilePicture } = req.body;

    // Find user by ID
    const user = await Users.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If username is being updated, check if it's unique
    if (username && username !== user.username) {
      const existingUser = await Users.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      user.username = username;
    }

    // Update profile picture if provided
    if (profilePicture) {
      user.profile_picture = profilePicture;
    }

    // Save changes
    await user.save();

    // Return updated profile
    res.json({
      message: 'Profile updated successfully',
      user: {
        userId: user.user_id,
        username: user.username,
        friendCode: user.friend_code,
        profilePicture: user.profile_picture
      }
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

// Export controllers
module.exports = {
  signupController,
  loginController,
  getProfileController,
  updateProfileController
};