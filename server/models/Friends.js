module.exports = (sequelize, DataTypes) => {
  const Friend = sequelize.define('friend', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    friend_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
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
    tableName: 'friends',
    timestamps: false
  });

  Friend.associate = (models) => {
    // Define associations with other models
    Friend.belongsTo(models.Users, { foreignKey: 'user_id', as: 'User' });
    Friend.belongsTo(models.Users, { foreignKey: 'friend_id', as: 'FriendUser' });
  };

  return Friend;
};