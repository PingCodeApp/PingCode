module.exports = (sequelize, DataTypes) => {
  const FriendRequest = sequelize.define('friend_request', {
    request_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    receiver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    tableName: 'friend_requests',
    timestamps: false
  });

  FriendRequest.associate = (models) => {
    // Define associations with other models
    FriendRequest.belongsTo(models.Users, { foreignKey: 'sender_id', as: 'Sender' });
    FriendRequest.belongsTo(models.Users, { foreignKey: 'receiver_id', as: 'Receiver' });
  };

  return FriendRequest;
};