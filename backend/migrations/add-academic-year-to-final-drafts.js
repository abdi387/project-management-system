const { sequelize } = require('../config/db');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('Starting migration: Add academic_year_id and semester to final_drafts...');
    
    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('final_drafts');
    
    if (!tableDescription.academic_year_id) {
      console.log('Adding academic_year_id column...');
      await queryInterface.addColumn('final_drafts', 'academic_year_id', {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true, // Temporarily allow null
        references: {
          model: 'academic_years',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });
    } else {
      console.log('Column academic_year_id already exists.');
    }
    
    if (!tableDescription.semester) {
      console.log('Adding semester column...');
      await queryInterface.addColumn('final_drafts', 'semester', {
        type: sequelize.Sequelize.ENUM('1', '2'),
        allowNull: true // Temporarily allow null
      });
    } else {
      console.log('Column semester already exists.');
    }
    
    // Populate the new columns from the groups table
    console.log('Populating academic_year_id and semester from groups table...');
    await sequelize.query(`
      UPDATE final_drafts fd
      INNER JOIN groups g ON fd.group_id = g.id
      SET fd.academic_year_id = g.academic_year_id,
          fd.semester = (
            SELECT ay.semester 
            FROM academic_years ay 
            WHERE ay.id = g.academic_year_id
          )
      WHERE fd.academic_year_id IS NULL
    `);
    
    // Now make the columns NOT NULL since they're populated
    console.log('Setting columns to NOT NULL...');
    await queryInterface.changeColumn('final_drafts', 'academic_year_id', {
      type: sequelize.Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'academic_years',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    
    await queryInterface.changeColumn('final_drafts', 'semester', {
      type: sequelize.Sequelize.ENUM('1', '2'),
      allowNull: false
    });
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('Migration script finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration script error:', err);
    process.exit(1);
  });
