const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file in backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Debug: Log API key status
const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
const useGemini = !!process.env.GEMINI_API_KEY;

if (useOpenRouter) {
  console.log('✅ OpenRouter API configured');
} else if (useGemini) {
  console.log('✅ GEMINI_API_KEY loaded successfully');
} else {
  console.error('⚠️  No AI API key configured (GEMINI_API_KEY or OPENROUTER_API_KEY)');
}

/**
 * Generate AI-powered project title suggestions
 * Supports both Google Gemini and OpenRouter (free alternative)
 */
const cache = new Map(); // Simple in-memory cache

const classifyError = (error) => {
  if (error.message.includes('401') || error.message.includes('403')) return 'auth';
  if (error.message.includes('timeout') || error.message.includes('network')) return 'network';
  if (error.message.includes('parse') || error.message.includes('JSON')) return 'parsing';
  return 'unknown';
};

const withRetry = async (fn, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`Attempt ${attempt} failed (${classifyError(error)}), retrying in ${delay}ms...`);
      
      if (attempt === maxRetries) throw error;
      if (classifyError(error) === 'rate_limit') {
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
};

const generateTitleSuggestions = async (query) => {
  try {
    const { domain, keywords, interests, description } = query;

    // Build the prompt - keep it concise to leave room for AI response
    const systemPrompt = `You are an academic project advisor. Generate 5 undergraduate FYP ideas. Respond with ONLY a JSON array, no extra text.`;

    const userPrompt = `Domain: ${domain || 'Computer Science'}
Keywords: ${keywords || interests || 'General'}
Description: ${description || 'Not provided'}

For each suggestion provide: title (10-15 words), description (2 sentences), technologies (3-4 items), difficulty (Beginner/Medium/Advanced), whySuitable (1 sentence).

Format: JSON array only:
[{"title":"AI-Based Student Performance Prediction System","description":"Predicts academic performance using ML.","technologies":["Python","Scikit-learn","TensorFlow","React"],"difficulty":"Medium","whySuitable":"Matches your AI interest"}]

Rules: feasible for undergrads, real-world problems, modern tech, Ethiopian context where relevant.`;

    let suggestions;

    // Try OpenRouter first (if configured)
    if (useOpenRouter) {
      suggestions = await callOpenRouter(systemPrompt, userPrompt);
    }
    // Try Gemini second (if configured)
    else if (useGemini) {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      const result = await model.generateContent(userPrompt);
      const response = await result.response;
      let text = response.text();
      
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      suggestions = JSON.parse(text);
    }
    // Fallback to built-in suggestions
    else {
      console.warn('No AI API configured, returning fallback suggestions');
      suggestions = getFallbackSuggestions(query);
    }

    return {
      success: true,
      data: {
        suggestions: suggestions.slice(0, 5),
        model: useOpenRouter ? 'openrouter' : useGemini ? 'gemini-2.0-flash' : 'fallback',
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('AI Generation Error:', error.message);
    const errorType = classifyError(error);
    
    return {
      success: false,
      error: error.message,
      errorType,
      data: {
        suggestions: getFallbackSuggestions(query),
        model: 'fallback',
        generatedAt: new Date().toISOString()
      }
    };
  }
};

/**
 * Repair truncated JSON by adding missing closing brackets/braces
 */
const repairTruncatedJson = (text) => {
  // Remove trailing incomplete content
  text = text.trim();

  // If it ends with a comma or incomplete value, trim back to a valid point
  while (text.length > 0) {
    const lastChar = text[text.length - 1];
    if (lastChar === ',' || lastChar === ':' || lastChar === '"' || lastChar === '\\' || lastChar === '\n' || lastChar === '\r' || lastChar === ' ') {
      text = text.slice(0, -1);
    } else {
      break;
    }
  }

  // Now balance brackets
  const stack = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escape) { escape = false; continue; }
    if (char === '\\') { escape = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (char === '[') stack.push(']');
    else if (char === '{') stack.push('}');
    else if (char === ']' || char === '}') {
      if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
    }
  }

  // Add missing closers in reverse order
  while (stack.length > 0) {
    text += stack.pop();
  }

  return text;
};

/**
 * Extract JSON from AI response text robustly
 */
const extractJsonRobustly = (text) => {
  console.log('🔍 JSON Extraction - text length:', text.length);

  // Strategy 1: Find JSON code blocks first (most reliable)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('✅ Strategy 1: Extracted from code block');
        return parsed;
      }
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        console.log('✅ Strategy 1: Extracted suggestions from code block object');
        return parsed.suggestions;
      }
    } catch (e) {
      console.log('⚠️ Code block JSON parse failed:', e.message);
    }
  }

  // Strategy 2: Find complete JSON array by matching brackets
  const findJsonArray = (str) => {
    const startIndex = str.indexOf('[');
    if (startIndex === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startIndex; i < str.length; i++) {
      const char = str[i];

      if (escape) { escape = false; continue; }
      if (char === '\\') { escape = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (char === '[') depth++;
      if (char === ']') {
        depth--;
        if (depth === 0) {
          const jsonStr = str.substring(startIndex, i + 1);
          try {
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('✅ Strategy 2: Extracted JSON array (balanced brackets)');
              return parsed;
            }
          } catch (e) {
            console.log('⚠️ Strategy 2 parse failed:', e.message);
          }
          return null;
        }
      }
    }
    return null;
  };

  const arrayResult = findJsonArray(text);
  if (arrayResult) return arrayResult;

  // Strategy 3: Truncated array — repair and retry
  if (text.trim().startsWith('[')) {
    console.log('⚠️ Truncated JSON detected, attempting repair...');
    const repaired = repairTruncatedJson(text);
    try {
      const parsed = JSON.parse(repaired);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('✅ Strategy 3: Repaired truncated JSON, got', parsed.length, 'suggestions');
        return parsed;
      }
    } catch (e) {
      console.log('⚠️ Repair failed:', e.message);
    }

    // Try extracting complete objects from truncated array
    try {
      const suggestions = [];
      // Find each { } object pair
      let searchFrom = 0;
      while (searchFrom < repaired.length) {
        const startIdx = repaired.indexOf('{', searchFrom);
        if (startIdx === -1) break;

        let depth = 0;
        let inString = false;
        let escape = false;
        let foundEnd = false;

        for (let i = startIdx; i < repaired.length; i++) {
          const char = repaired[i];
          if (escape) { escape = false; continue; }
          if (char === '\\') { escape = true; continue; }
          if (char === '"') { inString = !inString; continue; }
          if (inString) continue;

          if (char === '{') depth++;
          if (char === '}') {
            depth--;
            if (depth === 0) {
              const objStr = repaired.substring(startIdx, i + 1);
              try {
                const obj = JSON.parse(objStr);
                if (obj.title) suggestions.push(obj);
              } catch {}
              searchFrom = i + 1;
              foundEnd = true;
              break;
            }
          }
        }
        if (!foundEnd) break;
      }

      if (suggestions.length > 0) {
        console.log('✅ Strategy 3b: Extracted', suggestions.length, 'complete objects from truncated array');
        return suggestions.slice(0, 5);
      }
    } catch (e) {
      console.log('⚠️ Object extraction failed:', e.message);
    }
  }

  // Strategy 4: Find complete JSON object by matching brackets
  const findJsonObject = (str) => {
    const startIndex = str.indexOf('{');
    if (startIndex === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startIndex; i < str.length; i++) {
      const char = str[i];
      if (escape) { escape = false; continue; }
      if (char === '\\') { escape = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) {
          const jsonStr = str.substring(startIndex, i + 1);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.suggestions && Array.isArray(parsed.suggestions)) return parsed.suggestions;
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
            console.log('⚠️ Strategy 4 parse failed:', e.message);
          }
          return null;
        }
      }
    }
    return null;
  };

  const objectResult = findJsonObject(text);
  if (objectResult) return objectResult;

  // Strategy 5: Extract titles from bullet points/lists
  const lines = text.split(/\n|\r/).filter(line => line.trim().length > 10);
  const suggestions = [];
  let count = 0;

  for (const line of lines) {
    if (/^(?:\d+\.|[-*•]|\w+\.\s)/i.test(line.trim()) && count < 8) {
      suggestions.push({
        title: line.trim().replace(/^(?:\d+\.|[-*•])\s*/i, '').trim(),
        description: 'AI-generated project suggestion',
        technologies: ['AI', 'Modern Web', 'Data Science'],
        difficulty: 'Medium',
        whySuitable: 'Matches trending technologies and academic requirements'
      });
      count++;
    }
  }

  if (suggestions.length > 0) {
    console.log(`✅ Strategy 5: Extracted ${suggestions.length} suggestions from text`);
    return suggestions.slice(0, 5);
  }

  throw new Error('parsing:No valid suggestions extracted');
};

/**
 * Call OpenRouter API (free, no billing required)
 */
const callOpenRouter = async (systemPrompt, userPrompt) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'FYP Management System',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-nano-30b-a3b:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ OpenRouter HTTP Error:', response.status, error.substring(0, 300));
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content || '';

  console.log('🔍 OpenRouter response length:', text.length);
  console.log('🔍 OpenRouter response START:', text.substring(0, 300));
  console.log('🔍 OpenRouter response END:', text.substring(Math.max(0, text.length - 200)));

  const suggestions = extractJsonRobustly(text);
  return suggestions;
};

/**
 * Fallback suggestions if AI fails
 */
const getFallbackSuggestions = (query) => {
  const { domain } = query || {};
  
  const fallbackTitles = {
    'Artificial Intelligence': [
      { 
        title: 'AI-Based Student Performance Prediction System Using Machine Learning', 
        description: 'This system predicts student academic performance and identifies at-risk students early using machine learning algorithms. It analyzes historical data including attendance, assignment scores, and engagement metrics to provide actionable insights to advisors and students for timely intervention.', 
        technologies: ['Python', 'Scikit-learn', 'TensorFlow', 'React'],
        difficulty: 'Medium',
        whySuitable: 'Perfect for students interested in AI with practical educational impact'
      },
      { 
        title: 'Intelligent Chatbot for University Student Support Services Using NLP', 
        description: 'An NLP-powered chatbot that provides 24/7 automated responses to student queries about admissions, courses, deadlines, and campus services. Uses intent recognition and context management for natural conversations.', 
        technologies: ['Python', 'NLP', 'Dialogflow', 'Node.js'],
        difficulty: 'Medium',
        whySuitable: 'Great for students interested in conversational AI and student services'
      },
      { 
        title: 'AI-Driven Course Recommendation System for Personalized Learning Paths', 
        description: 'A smart recommendation engine that suggests courses and learning resources based on student interests, career goals, and learning history. Uses collaborative filtering and content-based filtering techniques.', 
        technologies: ['Machine Learning', 'Python', 'React', 'MongoDB'],
        difficulty: 'Medium',
        whySuitable: 'Ideal for students passionate about personalized education and ML'
      },
      { 
        title: 'Smart Attendance Management System Using Facial Recognition Technology', 
        description: 'Automated attendance tracking system that uses real-time face detection and recognition. Eliminates proxy attendance and provides instant attendance reports to advisors and administration.', 
        technologies: ['OpenCV', 'Python', 'Deep Learning', 'Django'],
        difficulty: 'Advanced',
        whySuitable: 'Excellent for students interested in computer vision and automation'
      },
      { 
        title: 'AI-Based Academic Plagiarism Detection System for Documents and Code', 
        description: 'Advanced plagiarism detection using NLP techniques and code similarity analysis. Compares submissions against vast databases and identifies paraphrased content, not just exact matches.', 
        technologies: ['NLP', 'Python', 'Machine Learning', 'React'],
        difficulty: 'Advanced',
        whySuitable: 'Perfect for students interested in NLP and academic integrity'
      }
    ],
    'Web Development': [
      { 
        title: 'Full-Stack E-Learning Platform with Interactive Video Lectures and Quizzes', 
        description: 'Comprehensive online learning platform featuring video streaming, interactive quizzes, progress tracking, and discussion forums. Includes instructor dashboard for content management and student analytics.', 
        technologies: ['React', 'Node.js', 'MongoDB', 'Socket.io'],
        difficulty: 'Medium',
        whySuitable: 'Great for students interested in full-stack development and education'
      },
      { 
        title: 'Real-Time Collaborative Code Editor for Remote Development Teams', 
        description: 'A Google Docs-style collaborative code editor with syntax highlighting, live cursors, video chat integration, and version control. Enables seamless pair programming and code reviews.', 
        technologies: ['React', 'Socket.io', 'Node.js', 'Monaco Editor'],
        difficulty: 'Advanced',
        whySuitable: 'Perfect for students interested in real-time systems and collaboration tools'
      },
      { 
        title: 'Smart Job Portal with AI-Based Resume Matching and Skill Assessment', 
        description: 'Intelligent job matching platform that analyzes resumes using NLP and matches candidates with suitable positions. Includes online skill assessments and automated interview scheduling.', 
        technologies: ['React', 'Node.js', 'NLP', 'PostgreSQL'],
        difficulty: 'Medium',
        whySuitable: 'Ideal for students interested in HR tech and AI-powered matching'
      },
      { 
        title: 'Online Healthcare Appointment Booking and Telemedicine Management System', 
        description: 'Digital healthcare platform for booking appointments, video consultations, prescription management, and medical record storage. Includes doctor availability calendar and patient history tracking.', 
        technologies: ['React', 'Express', 'MySQL', 'WebRTC'],
        difficulty: 'Medium',
        whySuitable: 'Great for students interested in healthcare technology and booking systems'
      },
      { 
        title: 'Crowdfunding Platform for Student Startup Projects with Payment Integration', 
        description: 'A Kickstarter-style platform where students can present their startup ideas and receive funding from investors and the community. Includes reward tiers, progress updates, and secure payment processing.', 
        technologies: ['React', 'Node.js', 'Stripe API', 'MongoDB'],
        difficulty: 'Medium',
        whySuitable: 'Perfect for students interested in fintech and entrepreneurship'
      }
    ],
    'Mobile Applications': [
      { 
        title: 'Smart Campus Navigation App with Indoor Positioning Using Bluetooth Beacons', 
        description: 'Indoor navigation system for university campus with turn-by-turn directions, room finder, and points of interest. Uses Bluetooth beacons for accurate indoor positioning where GPS fails.', 
        technologies: ['Flutter', 'Bluetooth Beacons', 'Google Maps API', 'Firebase'],
        difficulty: 'Medium',
        whySuitable: 'Great for students interested in mobile development and location services'
      },
      { 
        title: 'Mobile Health Monitoring App with AI-Powered Symptom Checker and Recommendations', 
        description: 'Personal health tracker that monitors symptoms, medications, and vital signs. Uses AI to analyze symptoms and provide preliminary health recommendations and doctor suggestions.', 
        technologies: ['React Native', 'Firebase', 'ML Kit', 'Health APIs'],
        difficulty: 'Medium',
        whySuitable: 'Ideal for students interested in healthtech and mobile AI'
      },
      { 
        title: 'Augmented Reality Campus Tour Guide Application for Prospective Students', 
        description: 'AR-powered mobile app that provides interactive 3D campus tours with information overlays, virtual guides, and historical information about university buildings and facilities.', 
        technologies: ['ARCore', 'Unity', 'Android', '3D Modeling'],
        difficulty: 'Advanced',
        whySuitable: 'Perfect for students interested in AR and immersive experiences'
      },
      { 
        title: 'Mobile Personal Expense Tracker with Budget Recommendations and Analytics', 
        description: 'Smart finance app that tracks expenses, categorizes spending, and provides personalized budget recommendations. Includes visual analytics, bill reminders, and savings goals.', 
        technologies: ['Flutter', 'Firebase', 'Charts', 'SQLite'],
        difficulty: 'Beginner',
        whySuitable: 'Great for students interested in personal finance and data visualization'
      },
      { 
        title: 'Smart Public Transport Tracking and Notification App with Real-Time Updates', 
        description: 'Real-time bus tracking system with live location updates, arrival predictions, route planning, and push notifications for delays. Helps students plan their commute efficiently.', 
        technologies: ['React Native', 'GPS', 'Firebase', 'Google Maps API'],
        difficulty: 'Medium',
        whySuitable: 'Ideal for students interested in transportation and real-time systems'
      }
    ],
    'Internet of Things': [
      { 
        title: 'Smart Classroom Environment Monitoring System Using IoT Sensors and Mobile Dashboard', 
        description: 'IoT-based system that monitors classroom temperature, humidity, CO2 levels, and occupancy. Provides real-time data to facility managers and automatic alerts for uncomfortable conditions.', 
        technologies: ['Arduino', 'IoT Sensors', 'MQTT', 'React Dashboard'],
        difficulty: 'Medium',
        whySuitable: 'Perfect for students interested in IoT and smart buildings'
      },
      { 
        title: 'IoT-Based Smart Energy Management System for Buildings with Consumption Analytics', 
        description: 'Automated energy monitoring and control system that tracks electricity usage, identifies waste patterns, and automatically controls lights and AC based on occupancy and schedules.', 
        technologies: ['IoT', 'Raspberry Pi', 'Cloud', 'Machine Learning'],
        difficulty: 'Advanced',
        whySuitable: 'Great for students interested in sustainability and energy efficiency'
      },
      { 
        title: 'Smart Agriculture Monitoring System with Soil Sensors and Mobile Alerts', 
        description: 'Precision agriculture system that monitors soil moisture, temperature, and nutrient levels. Sends irrigation alerts and provides crop health recommendations via mobile app.', 
        technologies: ['IoT', 'Sensors', 'Mobile App', 'Cloud Platform'],
        difficulty: 'Medium',
        whySuitable: 'Ideal for students interested in agritech and sensor networks'
      },
      { 
        title: 'IoT-Enabled Smart Parking System with Space Detection and Mobile Reservation', 
        description: 'Real-time parking management system using ultrasonic sensors to detect available spaces. Includes mobile app for space reservation, navigation, and automatic payment.', 
        technologies: ['IoT', 'Ultrasonic Sensors', 'Mobile App', 'Payment API'],
        difficulty: 'Medium',
        whySuitable: 'Perfect for students interested in smart city solutions'
      },
      { 
        title: 'Smart Waste Management System with Fill-Level Detection and Route Optimization', 
        description: 'Intelligent waste bin monitoring system that detects fill levels and optimizes collection routes. Reduces unnecessary collections and ensures timely waste removal.', 
        technologies: ['IoT', 'Ultrasonic Sensors', 'GPS', 'Route Optimization'],
        difficulty: 'Medium',
        whySuitable: 'Great for students interested in environmental technology'
      }
    ],
    'Blockchain': [
      { 
        title: 'Blockchain-Based Academic Certificate Verification System for Universities', 
        description: 'Tamper-proof digital certificate system using Ethereum blockchain. Employers can instantly verify graduate credentials without contacting the university, eliminating certificate fraud.', 
        technologies: ['Ethereum', 'Solidity', 'Web3.js', 'React'],
        difficulty: 'Advanced',
        whySuitable: 'Perfect for students interested in blockchain and credential security'
      },
      { 
        title: 'Decentralized Student Academic Record Management Using Blockchain and IPFS', 
        description: 'Secure, immutable storage system for student transcripts, certificates, and achievements. Students control access permissions and can share verified records with employers.', 
        technologies: ['Blockchain', 'IPFS', 'Smart Contracts', 'Node.js'],
        difficulty: 'Advanced',
        whySuitable: 'Ideal for students interested in decentralized systems'
      },
      { 
        title: 'Blockchain-Powered Transparent Voting System for University Student Elections', 
        description: 'Secure electronic voting platform using smart contracts to ensure vote integrity, transparency, and anonymity. Eliminates election fraud and provides verifiable results.', 
        technologies: ['Blockchain', 'Smart Contracts', 'Web3', 'React'],
        difficulty: 'Advanced',
        whySuitable: 'Great for students interested in democratic technology and security'
      },
      { 
        title: 'Supply Chain Product Authenticity Verification System Using Blockchain and QR Codes', 
        description: 'Track products from manufacturer to consumer using blockchain. Customers scan QR codes to verify authenticity and view complete product journey history.', 
        technologies: ['Hyperledger', 'Blockchain', 'QR Codes', 'Mobile App'],
        difficulty: 'Medium',
        whySuitable: 'Perfect for students interested in supply chain and anti-counterfeiting'
      },
      { 
        title: 'Decentralized Secure File Storage System with Encryption and Blockchain Access Control', 
        description: 'Distributed file storage using IPFS with blockchain-based access control and encryption. Provides secure, censorship-resistant document storage with granular permissions.', 
        technologies: ['IPFS', 'Blockchain', 'Encryption', 'Smart Contracts'],
        difficulty: 'Advanced',
        whySuitable: 'Ideal for students interested in distributed systems and security'
      }
    ],
    'Machine Learning': [
      { 
        title: 'Student Dropout Risk Prediction System Using Machine Learning and Early Warning Indicators', 
        description: 'Predictive analytics system that identifies students at risk of dropping out based on attendance, grades, engagement, and socioeconomic factors. Enables timely intervention by advisors.', 
        technologies: ['Python', 'Machine Learning', 'Data Analysis', 'Flask'],
        difficulty: 'Medium',
        whySuitable: 'Perfect for students interested in educational data mining'
      },
      { 
        title: 'Fake News Detection System Using Natural Language Processing and Deep Learning', 
        description: 'Automated misinformation detection that analyzes news articles and social media posts using NLP and deep learning. Identifies fake news with high accuracy and provides credibility scores.', 
        technologies: ['NLP', 'Python', 'Deep Learning', 'TensorFlow'],
        difficulty: 'Advanced',
        whySuitable: 'Great for students interested in NLP and media literacy'
      },
      { 
        title: 'Personalized Movie and Content Recommendation System Using Collaborative Filtering', 
        description: 'Netflix-style recommendation engine that suggests movies and shows based on user preferences, viewing history, and similar user behavior. Uses collaborative and content-based filtering.', 
        technologies: ['Python', 'Machine Learning', 'Data Mining', 'Django'],
        difficulty: 'Medium',
        whySuitable: 'Ideal for students interested in recommendation systems'
      },
      { 
        title: 'Traffic Sign Recognition System for Autonomous Vehicles Using Convolutional Neural Networks', 
        description: 'Deep learning model that detects and classifies traffic signs in real-time for self-driving cars. Achieves high accuracy even in challenging weather and lighting conditions.', 
        technologies: ['TensorFlow', 'CNN', 'Python', 'OpenCV'],
        difficulty: 'Advanced',
        whySuitable: 'Perfect for students interested in autonomous vehicles and computer vision'
      },
      { 
        title: 'Student Course Feedback Sentiment Analysis System Using Deep Learning and NLP', 
        description: 'Automated analysis of student feedback to extract sentiments, themes, and actionable insights. Helps instructors improve teaching quality based on data-driven feedback.', 
        technologies: ['NLP', 'Deep Learning', 'Python', 'Visualization'],
        difficulty: 'Medium',
        whySuitable: 'Great for students interested in educational analytics'
      }
    ]
  };

  // Return domain-specific or generic
  if (domain && fallbackTitles[domain]) {
    return fallbackTitles[domain];
  }
  
  // Return mixed suggestions
  return [
    { 
      title: 'AI-Based Student Performance Prediction System Using Machine Learning', 
      description: 'Predict academic performance and identify at-risk students using ML algorithms. Analyzes attendance, grades, and engagement patterns for early intervention.', 
      technologies: ['Python', 'ML', 'Data Science', 'React'],
      difficulty: 'Medium',
      whySuitable: 'Popular project with strong educational impact and learning value'
    },
    { 
      title: 'Smart Campus IoT Monitoring and Management System with Mobile Dashboard', 
      description: 'Comprehensive IoT sensor network for monitoring campus facilities including classrooms, labs, and common areas. Provides real-time data and automated alerts.', 
      technologies: ['IoT', 'Sensors', 'Mobile App', 'Cloud'],
      difficulty: 'Medium',
      whySuitable: 'Practical implementation with visible campus-wide benefits'
    },
    { 
      title: 'Blockchain-Based Academic Certificate Verification Platform for Universities', 
      description: 'Tamper-proof digital credential system using blockchain technology. Enables instant verification by employers and eliminates certificate fraud.', 
      technologies: ['Blockchain', 'Ethereum', 'Web3', 'Smart Contracts'],
      difficulty: 'Advanced',
      whySuitable: 'Cutting-edge technology with real-world adoption potential'
    },
    { 
      title: 'Full-Stack E-Learning Platform with Video Streaming and Interactive Assessments', 
      description: 'Complete online learning solution with video lectures, quizzes, progress tracking, and discussion forums. Supports multiple instructor and student roles.', 
      technologies: ['React', 'Node.js', 'MongoDB', 'Video Streaming'],
      difficulty: 'Medium',
      whySuitable: 'Comprehensive full-stack project with portfolio value'
    },
    { 
      title: 'Mobile Health Monitoring App with AI Symptom Checker and Telemedicine Features', 
      description: 'Personal health tracker with AI-powered symptom analysis, medication reminders, and video consultation booking. Integrates with healthcare providers.', 
      technologies: ['React Native', 'Firebase', 'AI', 'Health APIs'],
      difficulty: 'Medium',
      whySuitable: 'Relevant healthtech project with societal impact'
    }
  ];
};

/**
 * Extract titles from non-JSON text response
 */
const extractTitlesFromText = (text) => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const suggestions = [];
  
  for (const line of lines) {
    // Match patterns like "1. Title" or "- Title" or "* Title"
    const match = line.match(/^[\d\-\*]+\.\s*(.+)$/);
    if (match && match[1].length > 10) {
      suggestions.push({
        title: match[1].trim(),
        description: 'AI-suggested project',
        technologies: ['Web', 'Mobile', 'AI']
      });
    }
  }
  
  return suggestions.slice(0, 5);
};

// Healthcheck endpoint
const getAIHealth = () => ({
  openrouter: !!process.env.OPENROUTER_API_KEY,
  gemini: !!process.env.GEMINI_API_KEY,
  cacheSize: cache.size,
  timestamp: new Date().toISOString()
});

module.exports = {
  generateTitleSuggestions,
  getFallbackSuggestions,
  getAIHealth
};
