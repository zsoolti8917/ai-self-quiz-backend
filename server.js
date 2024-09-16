// server.js
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();
const mongoose = require('mongoose'); // Import mongoose
const Question = require('./models/Question');
const { body, validationResult } = require('express-validator'); // Import express-validator

const app = express();
app.use(cors({
  origin: 'http://localhost:5173', // Update with your frontend's origin if different
  methods: ['GET', 'POST'],
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Securely store your API key
});

app.get('/api/questions', async (req, res) => {
    try {
      const questions = await Question.find();
      res.json(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'An error occurred while fetching questions.' });
    }
  });

  app.post('/api/questions',
    [
      body('text').notEmpty().withMessage('Question text is required.'),
      body('correctAnswer').notEmpty().withMessage('Correct answer is required.'),
    ],
    async (req, res) => {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const { text, correctAnswer } = req.body;
  
      try {
        // Create and save the new question
        const newQuestion = new Question({ text, correctAnswer });
        await newQuestion.save();
        res.status(201).json(newQuestion);
      } catch (error) {
        console.error('Error adding new question:', error);
        res.status(500).json({ error: 'An error occurred while adding the new question.' });
      }
    }
  );


app.post('/api/evaluate', async (req, res) => {
    const { questionId, userAnswer } = req.body;

    try {
      // Fetch the question from the database
      const question = await Question.findById(questionId);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }
  
      const { text: questionText, correctAnswer } = question;
  
      // Call OpenAI API to evaluate the answer
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly and helpful assistant designed to evaluate quiz answers. Your goal is to check the users response against a predefined answer. If the answer is correct, celebrate the achievement and share a fun fact to keep things interesting. If the answer is incorrect, kindly explain the right answer and offer an insightful explanation to help the user learn and improve for the future. Additionally, if you believe the predefined answer might be wrong, gently inform the user and encourage them to verify it through reliable and trusted sources. Make sure your tone is conversational and personal, as if you are speaking directly to the user.',
          },
          {
            role: 'user',
            content: `Question: ${questionText}
User's Answer: ${userAnswer}
Predefined correct Answer: ${correctAnswer}
Evaluate the user's answer based on the predefined answer. If the answer is correct, confirm it and provide a fun fact related to the topic. If the answer is incorrect, correct it and provide an insightful explanation to help the user understand and remember the correct information for the future. Additionally, double-check the predefined answer; if it seems wrong or outdated, notify the user that there may be an error and recommend verifying it through reliable sources. If the answer is correct always start with "Correct! +1 point." and if the answer is incorrect always start with "Incorrect! no points for that" and if the predefined answer is wrong always start with "Predefined answer might be wrong! and if the answer is partially correct always start with "Partially Correct! +0.5 points."`,
          },
        ],
      });
  
      const response = completion.choices[0].message.content.trim();
      res.json({ feedback: response });
    } catch (error) {
      console.error('Error evaluating answer:', error);
      res.status(500).json({ error: 'An error occurred while evaluating the answer.' });
    }
});
app.post('/api/conversation', async (req, res) => {
  const { conversationHistory } = req.body;

  if (!conversationHistory || conversationHistory.length === 0) {
    return res.status(400).json({ error: 'Conversation history is required.' });
  }

  try {
    // Call OpenAI API to generate a response based on the conversation history
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: conversationHistory, // Send the entire conversation history
    });

    const aiResponse = completion.choices[0].message.content.trim();
    res.json({ reply: aiResponse });

  } catch (error) {
    console.error('Error processing conversation:', error);
    res.status(500).json({ error: 'An error occurred while processing the conversation.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
