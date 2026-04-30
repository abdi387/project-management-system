const { Section } = require('../models');

const seedSections = async () => {
  console.log('🌱 Seeding sections...');

  const departments = ['Computer Science', 'Information Technology', 'Information Systems'];
  const sectionNames = ['A', 'B', 'C'];

  let created = 0;
  let skipped = 0;

  for (const department of departments) {
    for (const name of sectionNames) {
      try {
        // Check if section already exists
        const existing = await Section.findOne({
          where: { name, department }
        });

        if (existing) {
          console.log(`  ⏭️  Section ${name} - ${department} already exists`);
          skipped++;
          continue;
        }

        await Section.create({
          name,
          department,
          isActive: true,
          capacity: null,
          description: `Default section ${name} for ${department}`
        });

        console.log(`  ✅ Created Section ${name} - ${department}`);
        created++;
      } catch (error) {
        console.error(`  ❌ Error creating Section ${name} - ${department}:`, error.message);
      }
    }
  }

  console.log(`✅ Sections seeding complete: ${created} created, ${skipped} skipped`);
};

// Run if executed directly
if (require.main === module) {
  seedSections()
    .then(() => {
      console.log('✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = seedSections;
