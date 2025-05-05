function loadWallets() {
  const wallets = [];
  let i = 1;
  while (process.env[`WALLET_PK_${i}`]) {
    wallets.push(process.env[`WALLET_PK_${i}`]);
    i++;
  }
  if (wallets.length === 0) {
    throw new Error('No wallet private keys found in .env file');
  }
  return wallets;
}

module.exports = { loadWallets }; // ✅ ini penting
