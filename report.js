const axios = require('axios');
const { API_BASE_URL } = require('./config');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { notifyTelegram } = require('./telegram');

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function createAxiosInstance(proxy = null) {
  const config = {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://priortestnet.xyz/'
    }
  };

  if (proxy) {
    config.httpsAgent = new HttpsProxyAgent(`http://${proxy}`);
  }

  return axios.create(config);
}

async function reportSwap(walletAddress, txHash, blockNumber, fromToken, toToken, fromAmount, proxy = null) {
  try {
    const apiUrl = `${API_BASE_URL}/swap`;
    const axiosInstance = createAxiosInstance(proxy);

    const payload = {
      address: walletAddress.toLowerCase(),
      amount: fromAmount,
      tokenFrom: fromToken,
      tokenTo: toToken,
      txHash: txHash
    };

    const response = await axiosInstance.post(apiUrl, payload, {
      headers: {
        "Referer": "https://priortestnet.xyz/swap"
      }
    });

    console.log(`${colors.green}✅ Swap reported to API: ${response.status}${colors.reset}`);
    await notifyTelegram(`✅ Swap Reported to API: ${response.status}`);
    if (response.data?.pointsEarned !== undefined && response.data?.swapsRemaining !== undefined) {
      console.log(`${colors.white}📊 Points earned: ${response.data.pointsEarned}, Swaps remaining: ${response.data.swapsRemaining}${colors.reset}`);
      await notifyTelegram(`📊 Points: ${response.data.pointsEarned}, Swaps left: ${response.data.swapsRemaining}`);
    }

    return true;

  } catch (error) {
    console.error(`${colors.red}❌ Error reporting swap to API: ${error.message}${colors.reset}`);

    if (error.response) {
      const status = error.response.status;
      if (status === 400) {
        console.log(`${colors.yellow}⚠️ Swap rejected: Possibly invalid transaction or daily limit reached${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️ API responded with status: ${status}${colors.reset}`);
      }
    }

    return false;
  }
}

module.exports = {
  reportSwap,
  createAxiosInstance
};