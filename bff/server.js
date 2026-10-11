// bff/server.js
require('dotenv').config({ path: '../.env' }); // <-- Pointing to root .env
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Safe Environment Check
console.log('--- Environment Check ---');
console.log('Base URL:', process.env.LH_BASE_URL || 'Not found');
console.log('Token Loaded:', process.env.LH_API_TOKEN ? '✅ Yes' : '❌ No');
if (process.env.LH_API_TOKEN) {
  // Only print the first 4 characters to ensure it's reading the actual string
  console.log('Token starts with:', process.env.LH_API_TOKEN.substring(0, 4) + '...'); 
}
console.log('-------------------------');

const app = express();
app.use(cors());
app.use(express.json());

const LH_BASE_URL = process.env.LH_BASE_URL || 'https://api.learnhouse.app/v1';
const LH_API_TOKEN = process.env.LH_API_TOKEN || 'YOUR_LEARNHOUSE_ORG_TOKEN'; 

const proxyToLearnHouse = async (req, res, method, endpoint, data = null) => {
  try {
    const response = await axios({
      method,
      url: `${LH_BASE_URL}${endpoint}`,
      headers: { 
        'Authorization': `Bearer ${LH_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data
    });
    res.json(response.data);
  } catch (error) {
    console.error(`BFF Error on ${endpoint}:`, error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'BFF Error' });
  }
};

// 1. Get Course Meta
app.get('/api/courses/:courseUuid/meta', (req, res) => {
  proxyToLearnHouse(req, res, 'GET', `/courses/${req.params.courseUuid}/meta?slim=true`);
});

// 2. Get User Trail (Progress)
app.get('/api/admin/:orgSlug/trails/:userId/courses/:courseUuid', (req, res) => {
  const { orgSlug, userId, courseUuid } = req.params;
  proxyToLearnHouse(req, res, 'GET', `/admin/${orgSlug}/trails/${userId}/courses/${courseUuid}`);
});

// 3. Mark Activity as Complete (The required "Write" operation)
app.post('/api/admin/:orgSlug/trails/:userId/activities/:activityUuid/complete', (req, res) => {
  const { orgSlug, userId, activityUuid } = req.params;
  proxyToLearnHouse(req, res, 'POST', `/admin/${orgSlug}/trails/${userId}/activities/${activityUuid}/complete`);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 BFF running on http://localhost:${PORT}`));