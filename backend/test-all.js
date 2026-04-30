const axios = require('axios');

const API = 'http://localhost:5001/api';

const test = async () => {
  try {
    // 1. Test server
    console.log('🔍 Testing server...');
    const testRes = await axios.get(`${API}/test`);
    console.log('✅ Server OK:', testRes.data.message);
    console.log('📌 Available endpoints:', testRes.data.endpoints);

    // 2. Test registration status (public)
    console.log('\n🔍 Testing registration status...');
    const regRes = await axios.get(`${API}/academic/registration`);
    console.log('✅ Registration open:', regRes.data.isOpen);

    // 3. Login as admin
    console.log('\n🔍 Testing admin login...');
    const loginRes = await axios.post(`${API}/auth/login`, {
      email: 'admin@hu.edu.et',
      password: 'admin123'
    });
    console.log('✅ Login successful');
    const token = loginRes.data.token;

    // 4. Get current user
    console.log('\n🔍 Testing get current user...');
    const meRes = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ User:', meRes.data.user.name);

    // 5. Get all users
    console.log('\n🔍 Testing get all users...');
    const usersRes = await axios.get(`${API}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${usersRes.data.count} users`);

    // 6. Get academic year
    console.log('\n🔍 Testing get academic year...');
    const yearRes = await axios.get(`${API}/academic/current`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Academic year:', yearRes.data.academicYear);

    // 7. Get project domains
    console.log('\n🔍 Testing get domains...');
    const domainsRes = await axios.get(`${API}/academic/domains`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${domainsRes.data.domains.length} domains`);

    // 8. Get venues
    console.log('\n🔍 Testing get venues...');
    const venuesRes = await axios.get(`${API}/academic/venues`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Found ${venuesRes.data.venues.length} venues`);

    console.log('\n🎉 All tests passed! Your backend is ready!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
};

test();