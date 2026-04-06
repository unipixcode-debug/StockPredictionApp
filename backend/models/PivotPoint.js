const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PivotPoint = sequelize.define('PivotPoint', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    symbol: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('PEAK', 'TROUGH'),
        allowNull: false
    },
    significance: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Percentage change that triggered this pivot'
    }
}, {
    tableName: 'pivot_points',
    timestamps: true,
    indexes: [
        {
            fields: ['symbol', 'time']
        }
    ]
});

module.exports = PivotPoint;
