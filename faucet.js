const { ethers } = require('ethers');
const axios = require('axios');
const { notifyTelegram, sendSessionSummary } = require('./telegram');
const { createAxiosInstance } = require('./report');
const { sleep } = require('./utils');
const { FAUCET_ABI, PRIOR_TOKEN_ADDRESS, API_BASE_URL, FAUCET_CONTRACT_ADDRESS, ERC20_ABI } = require('./config');

async function reportFaucetClaim(walletAddress, proxy = null) {
  try {
    const axiosInstance = createAxiosInstance(proxy);
    const apiUrl = `${API_BASE_URL}/faucet/claim`;
    const payload = { address: walletAddress.toLowerCase() };

    const response = await axiosInstance.post(apiUrl, payload, {
      headers: { Referer: "https://priortestnet.xyz/faucet" }
    });

    console.log(`✅ Faucet claim reported to API: ${response.status}`);
    await notifyTelegram(`✅ Faucet claim reported to API: ${response.status}`);
    return true;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log(`⚠️ Faucet claim rejected: cooldown`);
      await notifyTelegram(`⚠️ Faucet claim rejected: Likely on cooldown`);
    } else {
      console.error(`❌ Error reporting faucet claim: ${error.message}`);
      await notifyTelegram(`❌ Error reporting faucet claim: ${error.message}`);
    }
    throw error;
  }
}

async function claimFaucet(wallet, provider, walletIndex, proxy = null) {
  const signer = new ethers.Wallet(wallet, provider);
  const address = signer.address;

  try {
    const axiosInstance = createAxiosInstance(proxy);
    const apiUrl = `${API_BASE_URL}/users/${address.toLowerCase()}`;
    const userData = (await axiosInstance.get(apiUrl)).data;

    if (userData.lastFaucetClaim) {
      const last = new Date(userData.lastFaucetClaim);
      if ((Date.now() - last.getTime()) < 24 * 60 * 60 * 1000) {
        const hrs = ((24 * 60 * 60 * 1000 - (Date.now() - last.getTime())) / 3600000).toFixed(2);
        console.log(`⚠️ Faucet cooldown: ${hrs}h`);
        return false;
      }
    }

    console.log(`🚰 Claiming faucet...`);
    const contract = new ethers.Contract(FAUCET_CONTRACT_ADDRESS, FAUCET_ABI, signer);
    const tx = await contract.claim();
    const receipt = await tx.wait();

    await reportFaucetClaim(address, proxy);
    await notifyTelegram(`🤑 *Faucet Claimed*\nWallet: \`${address}\`\nTx: \`${tx.hash}\``);
    return true;
  } catch (err) {
    console.error(`❌ Faucet claim error: ${err.message}`);
    await notifyTelegram(`❌ Faucet Claim Error\nWallet: \`${address}\`\nError: ${err.message}`);
    try {
      await reportFaucetClaim(address, proxy);
      return true;
    } catch {
      return false;
    }
  }
}

async function performAllFaucetClaims(wallets, proxies, provider) {
  let total = 0;
  const results = [];

  for (let i = 0; i < wallets.length; i++) {
    const proxy = proxies[i % proxies.length];
    const signer = new ethers.Wallet(wallets[i], provider);
    const address = signer.address;

    const success = await claimFaucet(wallets[i], provider, i, proxy);
    results.push({ address, success, message: success ? "Faucet claimed" : "Failed or cooldown" });
    if (success) total++;

    if (i < wallets.length - 1) await sleep(12000);
  }

  await sendSessionSummary("Faucet Claim", total, wallets.length, results);
  return total;
}

module.exports = {
  claimFaucet,
  reportFaucetClaim,
  performAllFaucetClaims
};
