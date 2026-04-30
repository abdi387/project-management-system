const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('student', 'advisor', 'dept-head', 'faculty-head', 'admin'),
    allowNull: false
  },
  department: {
    type: DataTypes.ENUM('Computer Science', 'Information Technology', 'Information Systems'),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'inactive', 'rejected'),
    defaultValue: 'pending'
  },
  studentId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'student_id'
  },
  section: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  cgpa: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    validate: {
      min: 2.0,
      max: 4.0
    }
  },
  gender: {
    type: DataTypes.ENUM('male', 'female'),
    allowNull: true
  },
  // Store file path, not the actual image
  profilePicture: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'profile_picture'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  },
  // Tracks when the user's previous session ended (for "Last active" display)
  sessionEndedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'session_ended_at'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  // Explicitly define indexes to avoid duplicate index creation
  indexes: [
    {
      name: 'users_email_unique',
      unique: true,
      fields: ['email']
    },
    {
      name: 'users_student_id_unique',
      unique: true,
      fields: ['student_id']
    },
    {
      name: 'users_role_index',
      fields: ['role']
    },
    {
      name: 'users_status_index',
      fields: ['status']
    },
    {
      name: 'users_department_index',
      fields: ['department']
    },
    {
      name: 'users_created_at_index',
      fields: ['created_at']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Class method to find user by email with password excluded by default
User.findByEmail = async function(email, includePassword = false) {
  const attributes = includePassword ? {} : { exclude: ['password'] };
  return await this.findOne({ 
    where: { email },
    attributes
  });
};

// Class method to find user by ID with password excluded
User.findById = async function(id, includePassword = false) {
  const attributes = includePassword ? {} : { exclude: ['password'] };
  return await this.findByPk(id, { attributes });
};

// Get user by student ID
User.findByStudentId = async function(studentId) {
  return await this.findOne({
    where: { studentId },
    attributes: { exclude: ['password'] }
  });
};

// Get all students in a department
User.getStudentsByDepartment = async function(department, status = 'active') {
  return await this.findAll({
    where: {
      role: 'student',
      department,
      status
    },
    attributes: { exclude: ['password'] },
    order: [['name', 'ASC']]
  });
};

// Get all advisors in a department
User.getAdvisorsByDepartment = async function(department) {
  return await this.findAll({
    where: {
      role: 'advisor',
      department,
      status: 'active'
    },
    attributes: { exclude: ['password'] },
    order: [['name', 'ASC']]
  });
};

// Count users by role
User.countByRole = async function(role, department = null) {
  const where = { role };
  if (department) where.department = department;
  return await this.count({ where });
};

// Search users by name or email
User.search = async function(query, role = null, department = null) {
  const where = {
    [Op.or]: [
      { name: { [Op.like]: `%${query}%` } },
      { email: { [Op.like]: `%${query}%` } },
      { studentId: { [Op.like]: `%${query}%` } }
    ]
  };
  
  if (role) where.role = role;
  if (department) where.department = department;
  
  return await this.findAll({
    where,
    attributes: { exclude: ['password'] },
    limit: 20
  });
};

module.exports = User;