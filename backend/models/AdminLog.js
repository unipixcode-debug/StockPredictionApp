const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminLog = sequelize.define('AdminLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  adminName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING, // e.g., 'UPDATE_CREDITS', 'UPDATE_SETTING'
    allowNull: false
  },
  targetId: {
    type: DataTypes.STRING, // User ID or Setting Key
    allowNull: true
  },
  details: {
    type: DataTypes.JSONB, // { prevValue: 100, newValue: 200, user: 'test@test.com' }
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = AdminLog;
