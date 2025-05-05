const { ethers } = require('ethers');
const { notifyTelegram, sendSessionSummary } = require('./telegram');
const { reportSwap, createAxiosInstance } = require('./report');
const { sleep } = require('./utils');
const { PRIOR_TOKEN_ADDRESS, USDC_TOKEN_ADDRESS, SWAP_ROUTER_ADDRESS, ERC20_ABI } = require('./config');

async function checkAndApproveToken(wallet, provider, index, proxy = null) {
  const signer = new ethers.Wallet(wallet, provider);
  const address = signer.address;

  try {
    const prior = new ethers.Contract(PRIOR_TOKEN_ADDRESS, ERC20_ABI, signer);
    const usdc = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, signer);
    const priorAmount = ethers.utils.parseUnits('0.1', await prior.decimals());
    const usdcAmount = ethers.utils.parseUnits('1', await usdc.decimals());

    if ((await prior.balanceOf(address)).gte(priorAmount)) {
      const allowance = await prior.allowance(address, SWAP_ROUTER_ADDRESS);
      if (allowance.lt(priorAmount)) {
        const tx = await prior.approve(SWAP_ROUTER_ADDRESS, ethers.constants.MaxUint256);
        await tx.wait();
      }
    }

    if ((await usdc.balanceOf(address)).gte(usdcAmount)) {
      const allowance = await usdc.allowance(address, SWAP_ROUTER_ADDRESS);
      if (allowance.lt(usdcAmount)) {
        const tx = await usdc.approve(SWAP_ROUTER_ADDRESS, ethers.constants.MaxUint256);
        await tx.wait();
      }
    }

    return true;
  } catch (err) {
    console.error(`Approval error: ${err.message}`);
    return false;
  }
}

async function executeSwap(wallet, provider, count, index, proxy = null, direction = null) {
  const signer = new ethers.Wallet(wallet, provider);
  const address = signer.address;
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  try {
    // Tentukan arah swap jika belum diatur
    direction = direction || (Math.random() < 0.5 ? 'PRIOR_TO_USDC' : 'USDC_TO_PRIOR');

    if (direction === 'PRIOR_TO_USDC') {
      const priorToken = new ethers.Contract(PRIOR_TOKEN_ADDRESS, ERC20_ABI, signer);
      const priorDecimals = await priorToken.decimals();
      const amount = ethers.utils.parseUnits('0.1', priorDecimals);
      const balance = await priorToken.balanceOf(address);

      if (balance.lt(amount)) {
        console.log(`${colors.yellow}⚠️ [${shortAddress}] PRIOR tidak cukup, coba arah sebaliknya...${colors.reset}`);
        return executeSwap(wallet, provider, count, index, proxy, 'USDC_TO_PRIOR');
      }

      const allowance = await priorToken.allowance(address, SWAP_ROUTER_ADDRESS);
      if (allowance.lt(amount)) {
        console.log(`${colors.yellow}⏳ [${shortAddress}] Approving PRIOR...${colors.reset}`);
        const approveTx = await priorToken.approve(SWAP_ROUTER_ADDRESS, ethers.constants.MaxUint256);
        await approveTx.wait();
        console.log(`${colors.green}✅ PRIOR approved${colors.reset}`);
      }

      const data = '0x8ec7baf1000000000000000000000000000000000000000000000000016345785d8a0000';
      console.log(`${colors.yellow}🔄 [${shortAddress}] Swapping 0.1 PRIOR to USDC...${colors.reset}`);

      const tx = await signer.sendTransaction({ to: SWAP_ROUTER_ADDRESS, data, gasLimit: 300000 });
      const receipt = await tx.wait();

      if (receipt.status === 0) throw new Error('Swap PRIOR→USDC failed (revert)');

      console.log(`${colors.green}✅ [${shortAddress}] Confirmed in block ${receipt.blockNumber}${colors.reset}`);
      await reportSwap(address, tx.hash, receipt.blockNumber, "PRIOR", "USDC", "0.1", proxy);
      await notifyTelegram(`✅ PRIOR→USDC confirmed for ${shortAddress} in block ${receipt.blockNumber}`);

    } else {
      const usdcToken = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, signer);
      const usdcDecimals = await usdcToken.decimals();
      const amount = ethers.utils.parseUnits('1', usdcDecimals);
      const balance = await usdcToken.balanceOf(address);

      if (balance.lt(amount)) {
        console.log(`${colors.yellow}⚠️ [${shortAddress}] USDC tidak cukup, coba arah sebaliknya...${colors.reset}`);
        return executeSwap(wallet, provider, count, index, proxy, 'PRIOR_TO_USDC');
      }

      const allowance = await usdcToken.allowance(address, SWAP_ROUTER_ADDRESS);
      if (allowance.lt(amount)) {
        console.log(`${colors.yellow}⏳ [${shortAddress}] Approving USDC...${colors.reset}`);
        const approveTx = await usdcToken.approve(SWAP_ROUTER_ADDRESS, ethers.constants.MaxUint256);
        await approveTx.wait();
        console.log(`${colors.green}✅ USDC approved${colors.reset}`);
      }

      const data = '0xea0e435800000000000000000000000000000000000000000000000000000000000f4240';
      console.log(`${colors.yellow}🔄 [${shortAddress}] Swapping 1 USDC to PRIOR...${colors.reset}`);

      const tx = await signer.sendTransaction({ to: SWAP_ROUTER_ADDRESS, data, gasLimit: 109139 });
      const receipt = await tx.wait();

      if (receipt.status === 0) throw new Error('Swap USDC→PRIOR failed (revert)');

      console.log(`${colors.green}✅ [${shortAddress}] Confirmed in block ${receipt.blockNumber}${colors.reset}`);
      await reportSwap(address, tx.hash, receipt.blockNumber, "USDC", "PRIOR", "1", proxy);
      await notifyTelegram(`✅ USDC→PRIOR confirmed for ${shortAddress} in block ${receipt.blockNumber}`);
    }

    return true;

  } catch (err) {
    console.error(`${colors.red}❌ Error during swap for ${shortAddress}: ${err.message}${colors.reset}`);

    if (direction === 'PRIOR_TO_USDC') {
      console.log(`${colors.yellow}🔁 Retry as USDC_TO_PRIOR...${colors.reset}`);
      return executeSwap(wallet, provider, count, index, proxy, 'USDC_TO_PRIOR');
    } else if (direction === 'USDC_TO_PRIOR') {
      console.log(`${colors.yellow}🔁 Retry as PRIOR_TO_USDC...${colors.reset}`);
      return executeSwap(wallet, provider, count, index, proxy, 'PRIOR_TO_USDC');
    }

    return false;
  }
}

async function completeAllSwaps(wallets, proxies, provider) {
  const MAX_SWAPS_PER_WALLET = 5;
  const results = [];
  let totalSwapsCompleted = 0;

  console.log(`\n${colors.bright}${colors.cyan}=== Starting swap session at ${new Date().toLocaleString()} ===${colors.reset}`);
  console.log(`${colors.yellow}🎯 Target: Up to ${MAX_SWAPS_PER_WALLET} swaps per wallet${colors.reset}`);

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
    const signer = new ethers.Wallet(wallet, provider);
    const address = signer.address;
    const shortAddress = `${address.substring(0, 6)}...${address.slice(-4)}`;
    let walletSwapsCompleted = 0;

    const axiosInstance = createAxiosInstance(proxy);
    const apiUrl = `${API_BASE_URL}/users/${address.toLowerCase()}`;

    try {
      const response = await axiosInstance.get(apiUrl);
      const userData = response.data;

      console.log(`\n${colors.cyan}🔹 Wallet #${i + 1}: ${shortAddress}${colors.reset}`);
      console.log(`${colors.white}Current daily swaps: ${userData.dailySwaps}/5${colors.reset}`);
      console.log(`${colors.white}Total points: ${userData.totalPoints}${colors.reset}`);

      if (userData.dailySwaps >= MAX_SWAPS_PER_WALLET) {
        console.log(`${colors.yellow}⚠️ Wallet reached daily limit (5/5). Skipping...${colors.reset}`);
        results.push({ address, success: false, message: `Daily limit reached` });
        continue;
      }

      const isApproved = await checkAndApproveToken(wallet, provider, i, proxy);
      if (!isApproved) {
        results.push({ address, success: false, message: `Approval failed` });
        continue;
      }

      while (walletSwapsCompleted + userData.dailySwaps < MAX_SWAPS_PER_WALLET) {
        const swapSuccess = await executeSwap(wallet, provider, totalSwapsCompleted + 1, i, proxy);

        results.push({
          address,
          success: swapSuccess,
          message: swapSuccess
            ? `Swap #${walletSwapsCompleted + 1}`
            : `Swap failed`
        });

        if (swapSuccess) {
          walletSwapsCompleted++;
          totalSwapsCompleted++;

          // Optional: recheck dailySwaps if you expect real-time updates
          const updatedUser = (await axiosInstance.get(apiUrl)).data;
          if (updatedUser.dailySwaps >= MAX_SWAPS_PER_WALLET) {
            console.log(`${colors.yellow}⚠️ Wallet reached updated daily limit. Moving on...${colors.reset}`);
            break;
          }
        } else {
          console.log(`${colors.yellow}⚠️ Swap failed for ${shortAddress}. Skipping rest...${colors.reset}`);
          break;
        }

        if (walletSwapsCompleted + userData.dailySwaps < MAX_SWAPS_PER_WALLET) {
          console.log(`${colors.yellow}⏳ Waiting 15 seconds before next swap...${colors.reset}`);
          await sleep(15000);
        }
      }

    } catch (err) {
      console.error(`${colors.red}❌ Error for wallet ${shortAddress}: ${err.message}${colors.reset}`);
      results.push({ address, success: false, message: `Error: ${err.message}` });
    }

    if (i < wallets.length - 1) {
      console.log(`${colors.yellow}⏳ Waiting 15 seconds before next wallet...${colors.reset}`);
      await sleep(15000);
    }
  }

  console.log(`\n${colors.green}🎉 Completed ${totalSwapsCompleted} swaps across all wallets${colors.reset}`);
  await sendSessionSummary("Swap", totalSwapsCompleted, wallets.length * MAX_SWAPS_PER_WALLET, results);

  return totalSwapsCompleted;
}


module.exports = {
  checkAndApproveToken,
  executeSwap,
  completeAllSwaps
};
