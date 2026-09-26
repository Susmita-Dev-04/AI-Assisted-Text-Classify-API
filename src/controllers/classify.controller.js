import { classifyTextService } from '../services/classify.service.js';

const MAX_TEXT_LENGTH = 2000; 

export const classifyText = async (req, res) => {
  try {
    const { text } = req.body;

    if (text === undefined || text === null) {
      return res.status(400).json({ error: 'Field "text" is required.' });
    }

    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Field "text" must be a string.' });
    }

    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      return res.status(400).json({ error: 'Field "text" cannot be empty.' });
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Field "text" exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`,
      });
    }

    const result = await classifyTextService(trimmedText);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Classification error:', error.message);

    // Distinguish AI service failure from unexpected server errors
    if (error.isAiServiceError) {
      return res.status(503).json({
        error: 'AI classification service is temporarily unavailable. Please try again later.',
      });
    }

    return res.status(500).json({ error: 'Failed to classify text. Please try again later.' });
  }
};