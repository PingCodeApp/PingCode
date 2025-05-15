module.exports = (sequelize, DataTypes) => {
  const Block = sequelize.define('block', {
    blocker_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    blocked_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
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
    tableName: 'blocks',
    timestamps: false
  });

  Block.associate = (models) => {
    // Define associations with other models
    Block.belongsTo(models.Users, { foreignKey: 'blocker_id', as: 'Blocker' });
    Block.belongsTo(models.Users, { foreignKey: 'blocked_id', as: 'Blocked' });
  };

  return Block;
};