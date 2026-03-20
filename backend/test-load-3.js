try {
  console.log('Test loading predictionEngine.js...');
  const engine = require('./services/predictionEngine.js');
  console.log('SUCCESS: predictionEngine.js loaded.');
} catch (e) {
  console.error('FAIL: Error while loading predictionEngine.js');
  console.error('Message:', e.message);
  console.error('Stack:', e.stack);
}
