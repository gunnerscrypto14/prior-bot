function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  
  async function countdown(seconds, message) {
    console.log(`\n⏱️ Starting countdown for ${formatTime(seconds)} - ${message}`);
    for (let i = seconds; i > 0; i--) {
      process.stdout.write(`\r⏱️ Time remaining: ${formatTime(i)} until ${message}`);
      await sleep(1000);
    }
    console.log('\n✅ Countdown completed. Starting next action.');
  }
  
  module.exports = { sleep, countdown, formatTime };
  