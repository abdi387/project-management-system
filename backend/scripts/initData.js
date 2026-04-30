const { sequelize } = require('../config/db');
const ProjectDomain = require('../models/ProjectDomain');
const Venue = require('../models/Venue');
const SystemSetting = require('../models/SystemSetting');
const RegistrationControl = require('../models/RegistrationControl');
const Section = require('../models/Section');

const defaultDomains = [
  'Web Development',
  'Mobile Application',
  'Machine Learning',
  'Data Science',
  'Cybersecurity',
  'IoT',
  'Cloud Computing',
  'Blockchain',
  'Artificial Intelligence',
  'Networking'
];

const defaultVenues = [
  'Hall A',
  'Room 201',
  'Lab B'
];

const defaultSections = [
  { name: 'A', department: 'Computer Science' },
  { name: 'B', department: 'Computer Science' },
  { name: 'C', department: 'Computer Science' },
  { name: 'A', department: 'Information Technology' },
  { name: 'B', department: 'Information Technology' },
  { name: 'C', department: 'Information Technology' },
  { name: 'A', department: 'Information Systems' },
  { name: 'B', department: 'Information Systems' },
  { name: 'C', department: 'Information Systems' }
];

const initData = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Initialize Project Domains
    console.log('\n📌 Initializing project domains...');
    for (const domainName of defaultDomains) {
      const [domain, created] = await ProjectDomain.findOrCreate({
        where: { name: domainName },
        defaults: { name: domainName }
      });
      if (created) {
        console.log(`   ✅ Created domain: ${domainName}`);
      } else {
        console.log(`   ℹ️ Domain already exists: ${domainName}`);
      }
    }

    // Initialize Venues
    console.log('\n📍 Initializing venues...');
    for (const venueName of defaultVenues) {
      const [venue, created] = await Venue.findOrCreate({
        where: { name: venueName },
        defaults: { 
          id: `venue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: venueName 
        }
      });
      if (created) {
        console.log(`   ✅ Created venue: ${venueName}`);
      } else {
        console.log(`   ℹ️ Venue already exists: ${venueName}`);
      }
    }

    // Initialize System Settings
    console.log('\n⚙️ Initializing system settings...');
    const defaultSettings = [
      { key: 'maximum_groups_per_advisor', value: '2' },
      { key: 'site_name', value: 'FYP Management System' },
      { key: 'session_timeout', value: '30' },
      { key: 'items_per_page', value: '20' }
    ];

    for (const setting of defaultSettings) {
      const [settings, created] = await SystemSetting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      if (created) {
        console.log(`   ✅ Created setting: ${setting.key} = ${setting.value}`);
      } else {
        console.log(`   ℹ️ Setting already exists: ${setting.key} = ${settings.value}`);
      }
    }

    // Initialize Registration Control
    console.log('\n🔓 Initializing registration control...');
    const [control, created] = await RegistrationControl.findOrCreate({
      where: { id: 1 },
      defaults: { isOpen: true }
    });
    if (created) {
      console.log('   ✅ Registration control initialized (OPEN)');
    } else {
      console.log(`   ℹ️ Registration control exists (${control.isOpen ? 'OPEN' : 'CLOSED'})`);
    }

    // Initialize Sections
    console.log('\n📚 Initializing sections...');
    for (const sectionData of defaultSections) {
      const [section, created] = await Section.findOrCreate({
        where: { 
          name: sectionData.name,
          department: sectionData.department
        },
        defaults: {
          ...sectionData,
          isActive: true,
          description: `Default section ${sectionData.name} for ${sectionData.department}`
        }
      });
      if (created) {
        console.log(`   ✅ Created section: ${sectionData.name} - ${sectionData.department}`);
      } else {
        console.log(`   ℹ️ Section already exists: ${sectionData.name} - ${sectionData.department}`);
      }
    }

    console.log('\n✅ All initial data loaded successfully!');
  } catch (error) {
    console.error('❌ Error initializing data:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
};

initData();

