const { Sequelize, DataTypes, Transaction } = require("sequelize");

// Initialize Sequelize connection
const connection = new Sequelize(process.env.Database, process.env.User, process.env.Password, {
  host: process.env.HOST,
  dialect: "mysql",
  logging: false
});

// Import models
const Users = require('./Users')(connection, DataTypes);
const FriendRequests = require('./FriendRequests')(connection, DataTypes);
const Friends = require('./Friends')(connection, DataTypes);
const Messages = require('./Messages')(connection, DataTypes);
const Blocks = require('./Blocks')(connection, DataTypes);
const DeletedChats = require('./DeletedChats')(connection, DataTypes);

// Define models object
const models = {
  Users,
  FriendRequests,
  Friends,
  Messages,
  Blocks,
  DeletedChats
};

// Define relationships between tables

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

connection
  .authenticate()
  .then(() => {
    console.log("Database is connected 👌✅");
  })
  .catch((err) => {
    console.error("Unable to connect to the database ❌", err);
    throw err;
  });

// Sync the database
// connection
//   .sync({ force: true }) // Use alter: true to update tables without dropping them
//   .then(() => console.log("Tables are created or updated"))
//   .catch((err) => {
//     console.error("Error syncing tables:", err);
//     throw err;
//   });

// Export models and connection
module.exports = {
  Users,
  FriendRequests,
  Friends,
  Messages,
  Blocks,
  DeletedChats,
  sequelize: connection
};
