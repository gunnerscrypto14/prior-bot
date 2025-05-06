require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

async function notifyTelegram(message) {
  if (!process.env.TELEGRAM_CHAT_ID) return;
  try {
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log('✅ Telegram notification sent');
  } catch (err) {
    console.error(`❌ Telegram notify failed: ${err.message}`);
  }
}

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function sendSessionSummary(summaryType, totalSuccess, totalAttempt, perWalletResults = []) {
  const timestamp = new Date().toLocaleString();
  let details = '';
  for (const result of perWalletResults) {
    const icon = result.success ? '✅' : '❌';
    details += `${icon} \`${shortAddress(result.address)}\` - ${result.message || (result.success ? 'Success' : 'Failed')}` + '\n';
  }
  const message = `📋 *${summaryType} Summary*\n\n🕒 ${timestamp}\n✅ Success: *${totalSuccess}*\n❌ Failed: *${totalAttempt - totalSuccess}*\n🎯 Total: *${totalAttempt}*\n\n🧾 *Details:*\n${details}`;
  await notifyTelegram(message);
}

async function sendDailySummary(faucetStats, swapStats, startTime, endTime) {
  const durationSec = Math.floor((endTime - startTime) / 1000);
  const h = Math.floor(durationSec / 3600);
  const m = Math.floor((durationSec % 3600) / 60);
  const s = durationSec % 60;
  const durationStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const successRate = (done, total) => total === 0 ? '0%' : `${((done / total) * 100).toFixed(1)}%`;

  const message = `📊 *Daily Execution Summary*\n\n🗓️ Date: ${new Date().toLocaleDateString()}\n🕒 Duration: ${durationStr}\n\n🚰 *Faucet Claims*\n✅ Success: ${faucetStats.success} / ${faucetStats.total} (${successRate(faucetStats.success, faucetStats.total)})\n❌ Failed: ${faucetStats.total - faucetStats.success}\n\n🔄 *Token Swaps*\n✅ Success: ${swapStats.success} / ${swapStats.total} (${successRate(swapStats.success, swapStats.total)})\n❌ Failed: ${swapStats.total - swapStats.success}`;

  await notifyTelegram(message);
}

module.exports = {
  notifyTelegram,
  sendSessionSummary,
  sendDailySummary
};
