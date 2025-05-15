const { Users, Blocks } = require('../models');

/**
 * Controller for blocking a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const blockUserController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { blockedId } = req.params;

    // Validate blockedId is not the user's own ID
    if (parseInt(blockedId) === userId) {
      return res.status(400).json({ message: 'You cannot block yourself' });
    }

    // Check if user already blocked this person
    const existingBlock = await Blocks.findOne({
      where: {
        blocker_id: userId,
        blocked_id: blockedId
      }
    });

    if (existingBlock) {
      return res.status(400).json({ message: 'User is already blocked' });
    }

    // Check if the blocked user exists
    const blockedUser = await Users.findByPk(blockedId);
    if (!blockedUser) {
      return res.status(404).json({ message: 'User to block not found' });
    }

    // Create a new block record
    await Blocks.create({
      blocker_id: userId,
      blocked_id: parseInt(blockedId)
    });

    res.status(201).json({
      message: 'User blocked successfully',
      blockedUser: {
        userId: blockedUser.user_id,
        username: blockedUser.username
      }
    });
  } catch (error) {
    console.error('Block user error:', error.message);
    res.status(500).json({ message: 'Server error while blocking user' });
  }
};

/**
 * Controller for unblocking a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const unblockUserController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { blockedId } = req.params;

    // Find the block record
    const blockRecord = await Blocks.findOne({
      where: {
        blocker_id: userId,
        blocked_id: blockedId
      }
    });

    if (!blockRecord) {
      return res.status(404).json({ message: 'Block record not found' });
    }

    // Remove the block record
    await blockRecord.destroy();

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error.message);
    res.status(500).json({ message: 'Server error while unblocking user' });
  }
};

/**
 * Controller for getting the list of blocked users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getBlockedUsersController = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all users blocked by the current user
    const blockedUsers = await Blocks.findAll({
      where: { blocker_id: userId },
      include: [
        {
          model: Users,
          as: 'Blocked',
          attributes: ['user_id', 'username', 'friend_code', 'profile_picture']
        }
      ]
    });

    // Transform the data for response
    const blockedList = blockedUsers.map(block => ({
      userId: block.Blocked.user_id,
      username: block.Blocked.username,
      friendCode: block.Blocked.friend_code,
      profilePicture: block.Blocked.profile_picture,
      blockedAt: block.created_at
    }));

    res.json(blockedList);
  } catch (error) {
    console.error('Get blocked users error:', error.message);
    res.status(500).json({ message: 'Server error while retrieving blocked users' });
  }
};

module.exports = {
  blockUserController,
  unblockUserController,
  getBlockedUsersController
};
