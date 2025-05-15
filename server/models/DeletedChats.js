module.exports = (sequelize, DataTypes) => {
  const DeletedChat = sequelize.define('deleted_chat', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    other_user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    deleted_at: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    tableName: 'deleted_chats',
    timestamps: false
  });

  DeletedChat.associate = (models) => {
    // Define associations with other models
    DeletedChat.belongsTo(models.Users, { foreignKey: 'user_id', as: 'User' });
    DeletedChat.belongsTo(models.Users, { foreignKey: 'other_user_id', as: 'OtherUser' });
  };

  return DeletedChat;
};