import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CATEGORIES = ['Complaint', 'Query', 'Feedback', 'Other'];
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds — avoid hanging forever on a slow/dead AI call

export const classifyTextService = async (text) => {
  const prompt = `Classify the following text into exactly ONE of these categories: Complaint, Query, Feedback, Other.

Respond with ONLY a valid JSON object in this exact format, nothing else:
{"category": "<one of Complaint|Query|Feedback|Other>", "confidence": <a number between 0 and 1>}

Text: "${text}"`;

  let response;

  try {
    response = await axios.post(
      GROQ_API_URL,
      {
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );
  } catch (err) {
    const aiError = new Error('AI provider request failed: ' + err.message);
    aiError.isAiServiceError = true;
    throw aiError;
  }

  const rawContent = response?.data?.choices?.[0]?.message?.content?.trim();

  if (!rawContent) {
    return fallbackClassification(text);
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    return fallbackClassification(text);
  }

  if (!parsed?.category || !CATEGORIES.includes(parsed.category)) {
    return fallbackClassification(text);
  }

  const confidence =
    typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
      ? parsed.confidence
      : 0.5;

  return {
    category: parsed.category,
    confidence,
  };
};

const fallbackClassification = (text) => {
  const lower = text.toLowerCase();

  if (/(bad|worst|angry|unacceptable|complain|disappointed|refund)/.test(lower)) {
    return { category: 'Complaint', confidence: 0.4 };
  }
  if (/\?|how|what|when|where|why|can i/.test(lower)) {
    return { category: 'Query', confidence: 0.4 };
  }
  if (/(suggest|feedback|could be better|recommend|improve)/.test(lower)) {
    return { category: 'Feedback', confidence: 0.4 };
  }

  return { category: 'Other', confidence: 0.3 };
};