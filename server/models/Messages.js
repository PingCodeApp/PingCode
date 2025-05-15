module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('message', {
    message_id: {
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
    type: {
      type: DataTypes.ENUM('text', 'image', 'voice'),
      allowNull: false,
      defaultValue: 'text'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    media_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'seen'),
      defaultValue: 'sent'
    }
  }, {
    tableName: 'messages',
    timestamps: false
  });

  Message.associate = (models) => {
    // Define associations with other models
    Message.belongsTo(models.Users, { foreignKey: 'sender_id', as: 'Sender' });
    Message.belongsTo(models.Users, { foreignKey: 'receiver_id', as: 'Receiver' });
  };

  return Message;
};