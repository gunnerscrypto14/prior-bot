const { ethers } = require('ethers');
const { performAllFaucetClaims } = require('./faucet');
const { completeAllSwaps } = require('./swap');
const { loadWallets } = require('./wallets');
const { loadProxies } = require('./proxies');
const { countdown, sleep } = require('./utils');
const { sendDailySummary } = require('./telegram');
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};


const {
  CHAIN_ID,
  RPC_URL,
  SWAP_ROUTER_ADDRESS,
  PRIOR_TOKEN_ADDRESS,
  USDC_TOKEN_ADDRESS,
  FAUCET_CONTRACT_ADDRESS
} = require('./config');
const readline = require('readline');

function displayBanner() {
  const line = '-'.repeat(60);
  console.log(`\n\x1b[36m${line}`);
  console.log(`🔷 PRIOR TESTNET BOT - AIRDROP INSIDERS`);
  console.log(`${line}\x1b[0m`);
}

function displayMenu() {
  console.log(`\n\x1b[36m${'-'.repeat(60)}\x1b[0m`);
  console.log(`\x1b[1mPRIOR TESTNET BOT MENU\x1b[0m`);
  console.log(`\x1b[36m${'-'.repeat(60)}\x1b[0m`);
  console.log(` 1. Claim faucet only`);
  console.log(` 2. Perform 5 swaps only`);
  console.log(` 3. Claim faucet and then perform 5 swaps`);
  console.log(` 4. Start automatic daily routine (every 24h)`);
  console.log(` 0. Exit`);
  console.log(`\x1b[36m${'-'.repeat(60)}\x1b[0m`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`Select an option (0-4): `, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askInitialDelay() {
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('⏳ Delay eksekusi pertama berapa menit? (default 0): ', answer => {
      rl.close();
      const delayMinutes = parseInt(answer.trim(), 10);
      resolve(isNaN(delayMinutes) ? 0 : delayMinutes);
    });
  });
}

async function displayWalletInfo(wallets, proxies, provider) {
  console.log(`\n\x1b[36m${'-'.repeat(60)}\x1b[0m`);
  console.log(`\x1b[1m🔹 CHAIN INFO\x1b[0m`);
  console.log(`\x1b[36m${'-'.repeat(60)}\x1b[0m`);
  console.log(`🔗 Network: Base Sepolia Testnet`);
  console.log(`🔄 Swap Router: ${SWAP_ROUTER_ADDRESS}`);
  console.log(`💠 PRIOR Token: ${PRIOR_TOKEN_ADDRESS}`);
  console.log(`💵 USDC Token: ${USDC_TOKEN_ADDRESS}`);
  console.log(`🚰 Faucet Contract: ${FAUCET_CONTRACT_ADDRESS}`);
  console.log(`\x1b[36m${'-'.repeat(60)}\x1b[0m`);

  for (let i = 0; i < wallets.length; i++) {
    const signer = new ethers.Wallet(wallets[i], provider);
    const address = signer.address;
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

    try {
      const axiosInstance = require('./report').createAxiosInstance(proxies[i % proxies.length]);
      const user = (await axiosInstance.get(`https://priortestnet.xyz/api/users/${address.toLowerCase()}`)).data;

      console.log(`\n🔹 Wallet #${i + 1}: ${short}`);
      console.log(`Address: ${address}`);
      console.log(`ID: ${user.id}`);
      console.log(`Total Points: ${user.totalPoints}`);
      console.log(`Daily Points: ${user.dailyPoints}`);
      console.log(`Last Faucet Claim: ${user.lastFaucetClaim || 'Never'}`);
      console.log(`Is Admin: ${user.isAdmin}`);
    } catch (err) {
      console.error(`❌ Error fetching wallet info for ${short}: ${err.message}`);
    }

    if (i < wallets.length - 1) await sleep(2000);
  }
  console.log(`\x1b[36m${'-'.repeat(60)}\x1b[0m`);
}

async function main() {
  try {
    displayBanner();

    const wallets = loadWallets();
    const proxies = loadProxies();
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    await displayWalletInfo(wallets, proxies, provider);

    while (true) {
      const choice = await displayMenu();
      switch (choice) {
        case '0':
          console.log(`👋 Exiting application. Goodbye!`);
          process.exit(0);
        case '1':
          await performAllFaucetClaims(wallets, proxies, provider);
          break;
        case '2':
          await completeAllSwaps(wallets, proxies, provider);
          break;
        case '3':
          await performAllFaucetClaims(wallets, proxies, provider);
          console.log(`⏳ Waiting 30 seconds before starting swaps...`);
          await sleep(30000);
          await completeAllSwaps(wallets, proxies, provider);
          break;
          case '4': {
            const delayMinutes = await askInitialDelay();
            const initialDelaySec = delayMinutes * 60;
          
            if (initialDelaySec > 0) {
              console.log(`⏳ Menunggu selama ${delayMinutes} menit sebelum eksekusi pertama...`);
              await countdown(initialDelaySec, "memulai daily routine");
            }
          
            console.log(`🤖 Memulai daily routine otomatis...`);
            while (true) {
              const start = Date.now();
              const faucetDone = await performAllFaucetClaims(wallets, proxies, provider);
              console.log(`⏳ Menunggu 30 detik sebelum swap...`);
              await sleep(30000);
              const swapDone = await completeAllSwaps(wallets, proxies, provider);
              const end = Date.now();
          
              await sendDailySummary(
                { success: faucetDone, total: wallets.length },
                { success: swapDone, total: 5 },
                start,
                end
              );
              await countdown(24 * 60 * 60, "next daily routine");
            }
          }
        default:
          console.log(`❌ Invalid option. Please try again.`);
      }
    }
  } catch (err) {
    console.error(`❌ Main process error: ${err.message}`);
    await sleep(60000);
    main();
  }
}

main();
