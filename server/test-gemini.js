require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found in .env');
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log('Sending test prompt to Gemini...');
    const result = await model.generateContent('Say exactly: "API KEY WORKS"');
    const response = await result.response;
    console.log('Response:', response.text());
    console.log('SUCCESS: API Key is valid and working.');
  } catch (error) {
    console.error('ERROR: Failed to connect to Gemini API.');
    console.error(error.message);
  }
}

testGemini();
