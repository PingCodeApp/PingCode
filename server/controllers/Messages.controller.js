const { Users, Messages, Friends, Blocks, DeletedChats } = require('../models');
const { Sequelize, Op } = require('sequelize');

/**
 * Controller for getting chat messages with a friend
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMessagesController = async (req, res) => {
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

    // Check if user has blocked the friend or vice versa
    const blockExists = await Blocks.findOne({
      where: {
        [Op.or]: [
          { blocker_id: userId, blocked_id: friendId },
          { blocker_id: friendId, blocked_id: userId }
        ]
      }
    });

    if (blockExists) {
      return res.status(403).json({ message: 'Cannot access messages due to block' });
    }

    // Get messages between the user and the friend
    const messages = await Messages.findAll({
      where: {
        [Op.or]: [
          { sender_id: userId, receiver_id: friendId },
          { sender_id: friendId, receiver_id: userId }
        ]
      },
      order: [['timestamp', 'ASC']],
      include: [
        {
          model: Users,
          as: 'Sender',
          attributes: ['user_id', 'username']
        },
        {
          model: Users,
          as: 'Receiver',
          attributes: ['user_id', 'username']
        }
      ]
    });

    // Mark messages as seen if they were sent by the friend
    await Messages.update(
      { status: 'seen' },
      {
        where: {
          sender_id: friendId,
          receiver_id: userId,
          status: { [Op.ne]: 'seen' }
        }
      }
    );

    // Format the messages for the response
    const formattedMessages = messages.map(message => ({
      messageId: message.message_id,
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      type: message.type,
      content: message.content,
      mediaUrl: message.media_url,
      timestamp: message.timestamp,
      status: message.status,
      sender: {
        userId: message.Sender.user_id,
        username: message.Sender.username
      },
      receiver: {
        userId: message.Receiver.user_id,
        username: message.Receiver.username
      }
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Get messages error:', error.message);
    res.status(500).json({ message: 'Server error while retrieving messages' });
  }
};

/**
 * Controller for deleting a chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteChatController = async (req, res) => {
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

    // Check if chat is already deleted
    const existingDeletedChat = await DeletedChats.findOne({
      where: {
        user_id: userId,
        other_user_id: friendId
      }
    });

    if (existingDeletedChat) {
      return res.status(400).json({ message: 'Chat already deleted' });
    }

    // Mark the chat as deleted for this user
    await DeletedChats.create({
      user_id: userId,
      other_user_id: parseInt(friendId)
    });

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error.message);
    res.status(500).json({ message: 'Server error while deleting chat' });
  }
};

/**
 * Socket.io handler for sending messages
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Socket instance for the current connection
 * @param {Object} data - Message data
 * @param {Object} user - Authenticated user
 */
const handleSendMessage = async (io, socket, data, user) => {
  try {
    const { friendId, type, content, mediaUrl } = data;
    const userId = user.userId;

    // Verify the friendship exists
    const friendship = await Friends.findOne({
      where: {
        user_id: userId,
        friend_id: friendId
      }
    });

    if (!friendship) {
      return socket.emit('error', { message: 'Friendship not found' });
    }

    // Check if user has blocked the friend or vice versa
    const blockExists = await Blocks.findOne({
      where: {
        [Op.or]: [
          { blocker_id: userId, blocked_id: friendId },
          { blocker_id: friendId, blocked_id: userId }
        ]
      }
    });

    if (blockExists) {
      return socket.emit('error', { message: 'Cannot send message due to block' });
    }

    // Create a new message in the database
    const newMessage = await Messages.create({
      sender_id: userId,
      receiver_id: friendId,
      type: type || 'text',
      content,
      media_url: mediaUrl,
      status: 'sent'
    });

    // Get sender details
    const sender = await Users.findByPk(userId, {
      attributes: ['user_id', 'username']
    });

    // Prepare the message object to send via socket
    const messageObject = {
      messageId: newMessage.message_id,
      senderId: newMessage.sender_id,
      receiverId: newMessage.receiver_id,
      type: newMessage.type,
      content: newMessage.content,
      mediaUrl: newMessage.media_url,
      timestamp: newMessage.timestamp,
      status: newMessage.status,
      sender: {
        userId: sender.user_id,
        username: sender.username
      }
    };

    // Emit the message to the recipient's socket if they're online
    // This assumes you have a mapping of user IDs to socket IDs
    socket.to(`user_${friendId}`).emit('newMessage', messageObject);

    // Also emit back to sender for confirmation
    socket.emit('messageSent', messageObject);

    return messageObject;
  } catch (error) {
    console.error('Send message error:', error.message);
    socket.emit('error', { message: 'Error sending message' });
    return null;
  }
};

/**
 * Socket.io handler for updating message status
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Socket instance for the current connection
 * @param {Object} data - Status update data
 * @param {Object} user - Authenticated user
 */
const handleMessageStatusUpdate = async (io, socket, data, user) => {
  try {
    const { messageId, status } = data;
    const userId = user.userId;

    // Find the message
    const message = await Messages.findByPk(messageId);

    if (!message) {
      return socket.emit('error', { message: 'Message not found' });
    }

    // Verify the user is the receiver of the message
    if (message.receiver_id !== userId) {
      return socket.emit('error', { message: 'Not authorized to update this message' });
    }

    // Update the message status
    message.status = status;
    await message.save();

    // Emit the status update to the sender (if online)
    socket.to(`user_${message.sender_id}`).emit('messageStatusUpdate', {
      messageId,
      status
    });

    return { messageId, status };
  } catch (error) {
    console.error('Message status update error:', error.message);
    socket.emit('error', { message: 'Error updating message status' });
    return null;
  }
};

/**
 * Socket.io handler for typing indicators
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Socket instance for the current connection
 * @param {Object} data - Typing indicator data
 * @param {Object} user - Authenticated user
 */
const handleTypingIndicator = async (io, socket, data, user) => {
  try {
    const { friendId, isTyping } = data;
    const userId = user.userId;

    // Verify the friendship exists
    const friendship = await Friends.findOne({
      where: {
        user_id: userId,
        friend_id: friendId
      }
    });

    if (!friendship) {
      return socket.emit('error', { message: 'Friendship not found' });
    }

    // Emit typing status to the friend (if online)
    socket.to(`user_${friendId}`).emit('typingIndicator', {
      friendId: userId,
      isTyping
    });

    return { friendId, isTyping };
  } catch (error) {
    console.error('Typing indicator error:', error.message);
    socket.emit('error', { message: 'Error with typing indicator' });
    return null;
  }
};

module.exports = {
  getMessagesController,
  deleteChatController,
  handleSendMessage,
  handleMessageStatusUpdate,
  handleTypingIndicator
};
