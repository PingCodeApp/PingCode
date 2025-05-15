const { Users, FriendRequests, Friends } = require('../models');

/**
 * Controller for sending a friend request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendFriendRequestController = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { friendCode } = req.body;

    // Validate required fields
    if (!friendCode) {
      return res.status(400).json({ message: 'Friend code is required' });
    }

    // Find the receiver by friend code
    const receiver = await Users.findOne({ where: { friend_code: friendCode } });
    if (!receiver) {
      return res.status(404).json({ message: 'User with this friend code not found' });
    }

    // Check if user is trying to add themselves
    if (receiver.user_id === senderId) {
      return res.status(400).json({ message: 'You cannot add yourself as a friend' });
    }

    // Check if they are already friends
    const existingFriendship = await Friends.findOne({
      where: {
        user_id: senderId,
        friend_id: receiver.user_id
      }
    });

    if (existingFriendship) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }

    // Check if there's already a pending request
    const existingRequest = await FriendRequests.findOne({
      where: {
        sender_id: senderId,
        receiver_id: receiver.user_id
      }
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Check if there's a reverse request (receiver already sent a request to sender)
    const reverseRequest = await FriendRequests.findOne({
      where: {
        sender_id: receiver.user_id,
        receiver_id: senderId
      }
    });

    if (reverseRequest) {
      // If there's a reverse request, automatically accept it
      await reverseRequest.destroy();

      // Create bidirectional friendship entries
      await Friends.bulkCreate([
        { user_id: senderId, friend_id: receiver.user_id },
        { user_id: receiver.user_id, friend_id: senderId }
      ]);

      return res.status(200).json({
        message: 'Friend request accepted automatically',
        friendship: {
          userId: senderId,
          friendId: receiver.user_id,
          friendUsername: receiver.username
        }
      });
    }

    // Create a new friend request
    await FriendRequests.create({
      sender_id: senderId,
      receiver_id: receiver.user_id
    });

    res.status(201).json({
      message: 'Friend request sent successfully',
      requestDetails: {
        receiverId: receiver.user_id,
        receiverUsername: receiver.username
      }
    });
  } catch (error) {
    console.error('Send friend request error:', error.message);
    res.status(500).json({ message: 'Server error while sending friend request' });
  }
};

/**
 * Controller for getting pending friend requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPendingRequestsController = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find all pending friend requests where the user is the receiver
    const pendingRequests = await FriendRequests.findAll({
      where: { receiver_id: userId },
      include: [
        {
          model: Users,
          as: 'Sender',
          attributes: ['user_id', 'username', 'friend_code', 'profile_picture']
        }
      ]
    });

    res.json(
      pendingRequests.map(request => ({
        requestId: request.request_id,
        sender: {
          userId: request.Sender.user_id,
          username: request.Sender.username,
          friendCode: request.Sender.friend_code,
          profilePicture: request.Sender.profile_picture
        },
        createdAt: request.created_at
      }))
    );
  } catch (error) {
    console.error('Get pending requests error:', error.message);
    res.status(500).json({ message: 'Server error while retrieving pending requests' });
  }
};

/**
 * Controller for accepting a friend request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const acceptFriendRequestController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { requestId } = req.params;

    // Find the friend request
    const request = await FriendRequests.findByPk(requestId, {
      include: [
        {
          model: Users,
          as: 'Sender',
          attributes: ['user_id', 'username']
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Verify that the user is the receiver of the request
    if (request.receiver_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    // Create bidirectional friendship entries
    await Friends.bulkCreate([
      { user_id: userId, friend_id: request.sender_id },
      { user_id: request.sender_id, friend_id: userId }
    ]);

    // Delete the friend request
    await request.destroy();

    res.json({
      message: 'Friend request accepted',
      friendship: {
        userId: userId,
        friendId: request.sender_id,
        friendUsername: request.Sender.username
      }
    });
  } catch (error) {
    console.error('Accept friend request error:', error.message);
    res.status(500).json({ message: 'Server error while accepting friend request' });
  }
};

/**
 * Controller for declining a friend request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const declineFriendRequestController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { requestId } = req.params;

    // Find the friend request
    const request = await FriendRequests.findByPk(requestId);

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Verify that the user is the receiver of the request
    if (request.receiver_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to decline this request' });
    }

    // Delete the friend request
    await request.destroy();

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Decline friend request error:', error.message);
    res.status(500).json({ message: 'Server error while declining friend request' });
  }
};

module.exports = {
  sendFriendRequestController,
  getPendingRequestsController,
  acceptFriendRequestController,
  declineFriendRequestController
};
