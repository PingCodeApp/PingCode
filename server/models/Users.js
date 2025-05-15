module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('user', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    friend_code: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, {
    tableName: 'users',
    timestamps: false
  });

  User.associate = (models) => {
    // Define associations with other models
    User.hasMany(models.FriendRequests, { foreignKey: 'sender_id', as: 'SentFriendRequests' });
    User.hasMany(models.FriendRequests, { foreignKey: 'receiver_id', as: 'ReceivedFriendRequests' });
    User.hasMany(models.Friends, { foreignKey: 'user_id' });
    User.hasMany(models.Friends, { foreignKey: 'friend_id' });
    User.hasMany(models.Messages, { foreignKey: 'sender_id', as: 'SentMessages' });
    User.hasMany(models.Messages, { foreignKey: 'receiver_id', as: 'ReceivedMessages' });
    User.hasMany(models.Blocks, { foreignKey: 'blocker_id', as: 'BlockedUsers' });
    User.hasMany(models.Blocks, { foreignKey: 'blocked_id', as: 'BlockedByUsers' });
    User.hasMany(models.DeletedChats, { foreignKey: 'user_id' });
    User.hasMany(models.DeletedChats, { foreignKey: 'other_user_id' });
  };

  return User;
};