// === FILE: config.js ===
require('dotenv').config();

module.exports = {
  CHAIN_ID: 84532,
  RPC_URL: 'https://base-sepolia-rpc.publicnode.com/89e4ff0f587fe2a94c7a2c12653f4c55d2bda1186cb6c1c95bd8d8408fbdc014',
  EXPLORER_URL: 'https://base-sepolia.blockscout.com/',
  PRIOR_TOKEN_ADDRESS: '0xeFC91C5a51E8533282486FA2601dFfe0a0b16EDb',
  USDC_TOKEN_ADDRESS: '0xdB07b0b4E88D9D5A79A08E91fEE20Bb41f9989a2',
  SWAP_ROUTER_ADDRESS: '0x8957e1988905311EE249e679a29fc9deCEd4D910',
  FAUCET_CONTRACT_ADDRESS: '0xa206dC56F1A56a03aEa0fCBB7c7A62b5bE1Fe419',
  API_BASE_URL: 'https://priortestnet.xyz/api',
  ERC20_ABI: [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)'
  ],
  FAUCET_ABI: [
    'function claim() external'
  ]
};