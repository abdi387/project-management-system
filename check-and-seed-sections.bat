@echo off
echo =====================================
echo Section Database Checker and Seeder
echo =====================================
echo.

cd backend

echo Checking if sections exist in database...
echo.

node -e "const { Section, sequelize } = require('./models'); (async () => { try { await sequelize.authenticate(); const count = await Section.count(); console.log('Found ' + count + ' sections in database'); if (count === 0) { console.log(''); console.log('⚠️  No sections found! Running seeder...'); require('./seeders/seedSections')().then(() => process.exit(0)); } else { console.log('✅ Sections already exist, no seeding needed'); await sequelize.close(); process.exit(0); } } catch(e) { console.error('❌ Error:', e.message); process.exit(1); } })();"

echo.
echo =====================================
echo Done!
echo =====================================
