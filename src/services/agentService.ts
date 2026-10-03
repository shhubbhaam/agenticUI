// src/services/agentService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

// WARNING: Replace this with your actual API key for local testing.
// Do not commit this key to version control.
const API_KEY = 'AQ.Ab8RN6IWIFrjwj8adafGxzgD4PJ2mHQGiOsVkuLugdoM47AMEg'; 
const genAI = new GoogleGenerativeAI(API_KEY);

export async function fetchAgentLayout() {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite', generationConfig: { responseMimeType: 'application/json' }, });

  const prompt = `
    You are an AI learning assistant for a mobile app. 
    Your task is to generate a JSON layout for the user's home screen.
    The user just completed "Stage 02" of a course called "Context Windows".
    They need to start "Stage 03",The stage 03 talks about reliable agent systems so update the title and the subtitle accordingly for the card and it is which takes about 4 minutes to read.
    Provide a secondary quick-read option for "What tokens cost" (2 mins).

    You MUST output valid JSON matching this exact structure. Do not include markdown formatting.
    {
      "mainCard": {
        "component": "HomeCard",
        "props": {
          "category": "string",
          "stage": "string",
          "title": "string",
          "subtitle": "string",
          "readTime": "string",
          "buttonLabel": "string",
          "actionId": "string"
        }
      },
      "nextStepSection": {
        "component": "NextStepCard",
        "props": {
          "title": "string",
          "subtitle": "string",
          "actionId": "string"
        }
      }
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    
    // Log the raw text to your Metro bundler terminal to see exactly what Gemini returned
    console.log("RAW GEMINI RESPONSE:\n", rawText);

    // Aggressively extract only the JSON object
    const startIndex = rawText.indexOf('{');
    const endIndex = rawText.lastIndexOf('}') + 1;
    
    if (startIndex === -1) {
      throw new Error("No JSON object found in the response string.");
    }

    const cleanJsonString = rawText.slice(startIndex, endIndex);
    
    return JSON.parse(cleanJsonString); 

  } catch (error) {
    console.error('Agent Pipeline Error:', error);
    return null; // Return null so your UI safely triggers the fallback
  }
}