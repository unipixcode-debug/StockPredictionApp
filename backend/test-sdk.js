const genAI = require('@google/generative-ai');
console.log('Keys:', Object.keys(genAI));
console.log('Type of genAI:', typeof genAI);
if (genAI.GoogleGenAI) console.log('GoogleGenAI is a property');
if (typeof genAI === 'function') console.log('genAI is a function');
