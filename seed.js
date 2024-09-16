// seed.js
const mongoose = require('mongoose');
const Question = require('./models/Question');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const questions = [
  {
    text: 'What is the capital of France?',
    correctAnswer: 'Paris',
  },
  {
    text: 'What is the largest planet in our solar system?',
    correctAnswer: 'Jupiter',
  },
  // Add more questions as needed
];

async function seedDB() {
  try {
    await Question.deleteMany({});
    await Question.insertMany(questions);
    console.log('Database seeded!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDB();
