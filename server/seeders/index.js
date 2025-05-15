require('dotenv').config();
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const { Sequelize, DataTypes } = require('sequelize');

// Create a direct database connection
const sequelize = new Sequelize(process.env.Database, process.env.User, process.env.Password, {
  host: process.env.HOST,
  dialect: 'mysql',
  logging: false
});

// Import models with this connection
const Users = require('../models/Users')(sequelize, DataTypes);
const FriendRequests = require('../models/FriendRequests')(sequelize, DataTypes);
const Friends = require('../models/Friends')(sequelize, DataTypes);
const Messages = require('../models/Messages')(sequelize, DataTypes);
const Blocks = require('../models/Blocks')(sequelize, DataTypes);
const DeletedChats = require('../models/DeletedChats')(sequelize, DataTypes);

// Set up model associations

// Users relationships
Users.hasMany(FriendRequests, { foreignKey: 'sender_id', as: 'SentFriendRequests' });
Users.hasMany(FriendRequests, { foreignKey: 'receiver_id', as: 'ReceivedFriendRequests' });
Users.hasMany(Friends, { foreignKey: 'user_id' });
Users.hasMany(Friends, { foreignKey: 'friend_id' });
Users.hasMany(Messages, { foreignKey: 'sender_id', as: 'SentMessages' });
Users.hasMany(Messages, { foreignKey: 'receiver_id', as: 'ReceivedMessages' });
Users.hasMany(Blocks, { foreignKey: 'blocker_id', as: 'BlockedUsers' });
Users.hasMany(Blocks, { foreignKey: 'blocked_id', as: 'BlockedByUsers' });
Users.hasMany(DeletedChats, { foreignKey: 'user_id' });
Users.hasMany(DeletedChats, { foreignKey: 'other_user_id' });

// FriendRequests relationships
FriendRequests.belongsTo(Users, { foreignKey: 'sender_id', as: 'Sender' });
FriendRequests.belongsTo(Users, { foreignKey: 'receiver_id', as: 'Receiver' });

// Friends relationships
Friends.belongsTo(Users, { foreignKey: 'user_id', as: 'User' });
Friends.belongsTo(Users, { foreignKey: 'friend_id', as: 'FriendUser' });

// Messages relationships
Messages.belongsTo(Users, { foreignKey: 'sender_id', as: 'Sender' });
Messages.belongsTo(Users, { foreignKey: 'receiver_id', as: 'Receiver' });

// Blocks relationships
Blocks.belongsTo(Users, { foreignKey: 'blocker_id', as: 'Blocker' });
Blocks.belongsTo(Users, { foreignKey: 'blocked_id', as: 'Blocked' });

// DeletedChats relationships
DeletedChats.belongsTo(Users, { foreignKey: 'user_id', as: 'User' });
DeletedChats.belongsTo(Users, { foreignKey: 'other_user_id', as: 'OtherUser' });

// Number of records to generate
const NUM_USERS = 10;
const NUM_FRIEND_REQUESTS = 15;
const NUM_FRIENDS = 20;
const NUM_MESSAGES = 50;
const NUM_BLOCKS = 5;
const NUM_DELETED_CHATS = 5;

// Store generated data for reference
const generatedUsers = [];
const generatedFriendRequests = [];
const generatedFriends = [];

/**
 * Generate a unique friend code
 * @returns {string} A unique 6-character alphanumeric friend code
 */
const generateFriendCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = Array(3)
    .fill()
    .map(() => characters.charAt(Math.floor(Math.random() * 26)))
    .join('');

  const suffix = Array(3)
    .fill()
    .map(() => characters.charAt(26 + Math.floor(Math.random() * 10)))
    .join('');

  return prefix + suffix;
};

/**
 * Seed Users table
 */
const seedUsers = async () => {
  try {
    console.log('Seeding Users...');
    
    // Generate hashed password once to reuse (for testing convenience)
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const userData = Array(NUM_USERS).fill().map((_, i) => ({
      username: faker.internet.userName().toLowerCase().replace(/[^a-z0-9]/g, ''),
      password: hashedPassword,
      friend_code: generateFriendCode(),
      profile_picture: faker.image.avatar(),
      created_at: faker.date.past(),
      updated_at: faker.date.recent()
    }));
    
    const users = await Users.bulkCreate(userData);
    generatedUsers.push(...users);
    
    console.log(`Created ${users.length} users`);
    return users;
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

/**
 * Seed FriendRequests table
 */
const seedFriendRequests = async () => {
  try {
    console.log('Seeding Friend Requests...');
    
    const requestData = [];
    
    // Generate unique friend requests
    for (let i = 0; i < NUM_FRIEND_REQUESTS; i++) {
      // Get two different random users
      const availableUsers = generatedUsers.map(user => user.user_id);
      const sender_id = faker.helpers.arrayElement(availableUsers);
      
      // Remove sender from available receivers to avoid self-requests
      const receiversPool = availableUsers.filter(id => id !== sender_id);
      const receiver_id = faker.helpers.arrayElement(receiversPool);
      
      // Check if this pair already has a request
      const isDuplicate = requestData.some(
        req => (req.sender_id === sender_id && req.receiver_id === receiver_id) ||
              (req.sender_id === receiver_id && req.receiver_id === sender_id)
      );
      
      // Check if they're already friends (will be used after seeding friends)
      const areFriends = generatedFriends.some(
        f => (f.user_id === sender_id && f.friend_id === receiver_id) ||
            (f.user_id === receiver_id && f.friend_id === sender_id)
      );
      
      if (!isDuplicate && !areFriends) {
        requestData.push({
          sender_id,
          receiver_id,
          created_at: faker.date.recent()
        });
      } else {
        // Try again
        i--;
      }
    }
    
    const requests = await FriendRequests.bulkCreate(requestData);
    generatedFriendRequests.push(...requests);
    
    console.log(`Created ${requests.length} friend requests`);
    return requests;
  } catch (error) {
    console.error('Error seeding friend requests:', error);
    throw error;
  }
};

/**
 * Seed Friends table
 */
const seedFriends = async () => {
  try {
    console.log('Seeding Friendships...');
    
    const friendData = [];
    
    // Generate unique friendship pairs
    for (let i = 0; i < NUM_FRIENDS / 2; i++) {
      // Get two different random users
      const availableUsers = generatedUsers.map(user => user.user_id);
      const user_id = faker.helpers.arrayElement(availableUsers);
      
      // Remove user from available friends to avoid self-friendship
      const friendsPool = availableUsers.filter(id => id !== user_id);
      const friend_id = faker.helpers.arrayElement(friendsPool);
      
      // Check if this pair already has a friendship
      const isDuplicate = friendData.some(
        f => (f.user_id === user_id && f.friend_id === friend_id) ||
            (f.user_id === friend_id && f.friend_id === user_id)
      );
      
      if (!isDuplicate) {
        // Create bidirectional friendship (two entries)
        const timestamp = faker.date.past();
        friendData.push(
          {
            user_id,
            friend_id,
            created_at: timestamp
          },
          {
            user_id: friend_id,
            friend_id: user_id,
            created_at: timestamp
          }
        );
      } else {
        // Try again
        i--;
      }
    }
    
    const friends = await Friends.bulkCreate(friendData);
    generatedFriends.push(...friends);
    
    console.log(`Created ${friends.length} friendship records (${friends.length / 2} unique friendships)`);
    return friends;
  } catch (error) {
    console.error('Error seeding friends:', error);
    throw error;
  }
};

/**
 * Seed Messages table
 */
const seedMessages = async () => {
  try {
    console.log('Seeding Messages...');
    
    const messageData = [];
    
    // Get all unique friendship pairs
    const uniqueFriendships = [];
    generatedFriends.forEach(friendship => {
      const exists = uniqueFriendships.some(
        f => (f.user_id === friendship.friend_id && f.friend_id === friendship.user_id)
      );
      if (!exists) {
        uniqueFriendships.push({
          user_id: friendship.user_id,
          friend_id: friendship.friend_id
        });
      }
    });
    
    // Generate messages for each friendship
    for (let i = 0; i < NUM_MESSAGES; i++) {
      // Get a random friendship
      const friendship = faker.helpers.arrayElement(uniqueFriendships);
      
      // Randomly decide sender and receiver
      let sender_id, receiver_id;
      if (Math.random() > 0.5) {
        sender_id = friendship.user_id;
        receiver_id = friendship.friend_id;
      } else {
        sender_id = friendship.friend_id;
        receiver_id = friendship.user_id;
      }
      
      // Randomly select message type
      const type = faker.helpers.arrayElement(['text', 'image', 'text', 'text']);
      
      // Generate message content based on type
      let content = null;
      let media_url = null;
      
      if (type === 'text') {
        content = faker.lorem.sentence();
      } else if (type === 'image') {
        media_url = faker.image.url();
        content = faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 });
      }
      
      // Random timestamp within the last month
      const timestamp = faker.date.recent({ days: 30 });
      
      // Random status
      const status = faker.helpers.arrayElement(['sent', 'delivered', 'seen']);
      
      messageData.push({
        sender_id,
        receiver_id,
        type,
        content,
        media_url,
        timestamp,
        status
      });
    }
    
    const messages = await Messages.bulkCreate(messageData);
    console.log(`Created ${messages.length} messages`);
    return messages;
  } catch (error) {
    console.error('Error seeding messages:', error);
    throw error;
  }
};

/**
 * Seed Blocks table
 */
const seedBlocks = async () => {
  try {
    console.log('Seeding Blocks...');
    
    const blockData = [];
    
    // Get all available users
    const availableUsers = generatedUsers.map(user => user.user_id);
    
    for (let i = 0; i < NUM_BLOCKS; i++) {
      // Get two different random users
      const blocker_id = faker.helpers.arrayElement(availableUsers);
      const available_blocked = availableUsers.filter(id => id !== blocker_id);
      const blocked_id = faker.helpers.arrayElement(available_blocked);
      
      // Check if this pair already has a block
      const isDuplicate = blockData.some(
        b => b.blocker_id === blocker_id && b.blocked_id === blocked_id
      );
      
      if (!isDuplicate) {
        blockData.push({
          blocker_id,
          blocked_id,
          created_at: faker.date.recent()
        });
      } else {
        // Try again
        i--;
      }
    }
    
    const blocks = await Blocks.bulkCreate(blockData);
    console.log(`Created ${blocks.length} blocks`);
    return blocks;
  } catch (error) {
    console.error('Error seeding blocks:', error);
    throw error;
  }
};

/**
 * Seed DeletedChats table
 */
const seedDeletedChats = async () => {
  try {
    console.log('Seeding Deleted Chats...');
    
    const deletedChatData = [];
    
    // Get all unique friendship pairs
    const uniqueFriendships = [];
    generatedFriends.forEach(friendship => {
      const exists = uniqueFriendships.some(
        f => (f.user_id === friendship.friend_id && f.friend_id === friendship.user_id)
      );
      if (!exists) {
        uniqueFriendships.push({
          user_id: friendship.user_id,
          friend_id: friendship.friend_id
        });
      }
    });
    
    for (let i = 0; i < NUM_DELETED_CHATS; i++) {
      // Get a random friendship
      const friendship = faker.helpers.arrayElement(uniqueFriendships);
      
      // Randomly decide which user deleted the chat
      let user_id, other_user_id;
      if (Math.random() > 0.5) {
        user_id = friendship.user_id;
        other_user_id = friendship.friend_id;
      } else {
        user_id = friendship.friend_id;
        other_user_id = friendship.user_id;
      }
      
      // Check if this pair already has a deleted chat
      const isDuplicate = deletedChatData.some(
        d => d.user_id === user_id && d.other_user_id === other_user_id
      );
      
      if (!isDuplicate) {
        deletedChatData.push({
          user_id,
          other_user_id,
          deleted_at: faker.date.recent()
        });
      } else {
        // Try again
        i--;
      }
    }
    
    const deletedChats = await DeletedChats.bulkCreate(deletedChatData);
    console.log(`Created ${deletedChats.length} deleted chats`);
    return deletedChats;
  } catch (error) {
    console.error('Error seeding deleted chats:', error);
    throw error;
  }
};

/**
 * Main seeding function to run all seeds in the correct order
 */
const seedAll = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
    
    // Sync database and force table recreation
    await sequelize.sync({ force: true });
    console.log('Database tables dropped and recreated.');
    
    // Seed tables in order with correct dependencies
    await seedUsers();
    await seedFriends();
    await seedFriendRequests();
    await seedMessages();
    await seedBlocks();
    await seedDeletedChats();
    
    console.log('All seed data inserted successfully!');
    
    // Create an admin user for testing
    const adminUser = await Users.create({
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      friend_code: 'ADM123',
      profile_picture: faker.image.avatar(),
      created_at: new Date(),
      updated_at: new Date()
    });
    
    console.log(`Created admin user with username: admin, password: admin123, friend code: ${adminUser.friend_code}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error running seeds:', error);
    process.exit(1);
  }
};

// Run the seed function
seedAll();
