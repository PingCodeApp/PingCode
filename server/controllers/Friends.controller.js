const { Users, Friends, DeletedChats, Blocks } = require('../models');
const { Sequelize } = require('sequelize');

/**
 * Controller for getting the user's friends list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getFriendsListController = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all friends with their user details
    const friends = await Friends.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Users,
          as: 'FriendUser',
          attributes: ['user_id', 'username', 'friend_code', 'profile_picture']
        }
      ]
    });

    // Transform the data for response
    const friendsList = friends.map(friend => ({
      userId: friend.friend_id,
      username: friend.FriendUser.username,
      friendCode: friend.FriendUser.friend_code,
      profilePicture: friend.FriendUser.profile_picture,
      since: friend.created_at
    }));

    res.json(friendsList);
  } catch (error) {
    console.error('Get friends list error:', error.message);
    res.status(500).json({ message: 'Server error while retrieving friends list' });
  }
};

/**
 * Controller for removing a friend
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeFriendController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { friendId } = req.params;

    // Verify the friendship exists
    const friendship = await Friends.findOne({
      where: {
        user_id: userId,
        friend_id: friendId
      }
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Friendship not found' });
    }

    // Delete both directions of the friendship (bidirectional)
    await Friends.destroy({
      where: {
        [Sequelize.Op.or]: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId }
        ]
      }
    });

    // Mark the chat as deleted for the user (optional, depends on requirements)
    await DeletedChats.create({
      user_id: userId,
      other_user_id: parseInt(friendId)
    });

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error.message);
    res.status(500).json({ message: 'Server error while removing friend' });
  }
};

/**
 * Controller for getting the dashboard data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardController = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all friends with their user details
    const friends = await Friends.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Users,
          as: 'FriendUser',
          attributes: ['user_id', 'username', 'profile_picture']
        }
      ]
    });

    // Get friend IDs for querying recent messages
    const friendIds = friends.map(friend => friend.friend_id);

    // Get blocked users to filter them out
    const blockedUsers = await Blocks.findAll({
      where: { blocker_id: userId },
      attributes: ['blocked_id']
    });
    const blockedIds = blockedUsers.map(block => block.blocked_id);

    // Get deleted chats to filter them out
    const deletedChats = await DeletedChats.findAll({
      where: { user_id: userId },
      attributes: ['other_user_id']
    });
    const deletedChatIds = deletedChats.map(chat => chat.other_user_id);

    // Filter out blocked and deleted friends
    const filteredFriendIds = friendIds.filter(
      id => !blockedIds.includes(id) && !deletedChatIds.includes(id)
    );

    // Transform the data for response
    const friendsList = friends
      .filter(friend => filteredFriendIds.includes(friend.friend_id))
      .map(friend => ({
        userId: friend.friend_id,
        username: friend.FriendUser.username,
        profilePicture: friend.FriendUser.profile_picture,
        online: false // This will be updated via Socket.io
      }));

    // Dashboard data (simplified without messages for now)
    // In a real implementation, you would also fetch the most recent message for each friend
    const dashboardData = {
      friends: friendsList,
      recentChats: [] // This would be populated with the most recent messages
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Get dashboard error:', error.message);
    res.status(500).json({ message: 'Server error while retrieving dashboard data' });
  }
};

module.exports = {
  getFriendsListController,
  removeFriendController,
  getDashboardController
};
