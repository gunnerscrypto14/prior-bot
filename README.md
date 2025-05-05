# Prior Testnet Auto Bot

An automated bot for interacting with Prior Protocol on the Base Sepolia Testnet. This bot handles wallet faucet claiming and token swapping between PRIOR and USDC. It includes proxy support, Telegram notifications, retry logic, and auto daily routines.

---

## 🔍 Features

- 🔁 Automatically swaps PRIOR ↔ USDC on Prior Protocol (Base Sepolia)
- 🚰 Faucet claim automation with cooldown detection
- 👛 Supports multiple wallets (loaded via `.env`)
- 🌐 Optional proxy usage (per wallet)
- 📡 Auto-reporting of swap activity to Prior Protocol's API
- 📲 Telegram notifications per wallet and per session
- 🕒 Daily automation with configurable initial delay
- 🔄 Auto fallback (switches direction if insufficient balance)
- 📈 Execution summary after each session

---

## 🛠️ Requirements

- Node.js v16 or higher
- Wallets funded with:
  - PRIOR tokens
  - USDC tokens
  - Base Sepolia ETH (for gas)
- A Telegram bot and your chat ID (for notifications)

---

## ⚙️ Setup

1. Clone this repository:
```bash
git clone https://github.com/gunnerscrypto14/prior-bot/
````

2. Go to the project directory:

```bash
cd prior-bot
```

3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file in the root directory:

```env
WALLET_PK_1=your_private_key_1
WALLET_PK_2=your_private_key_2
# Add as many as needed

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

5. (Optional) Create a `proxies.txt` file for proxy rotation (one per line):

```
user:pass@ip:port
ip:port
http://user:pass@ip:port
```

---

## 🚀 How to Run

Start the bot:

```bash
node index.js
```

Menu options:

```
1. Faucet claim only
2. Token swap only
3. Faucet + Swap
4. Daily auto routine (every 24 hours, with optional delay)
0. Exit
```

---

## ⚠️ Important Notes

* The bot attempts up to 5 swaps per wallet daily
* If a wallet lacks PRIOR/USDC, it auto-switches swap direction
* Transactions are reported to Prior's API
* Execution and results are sent via Telegram
* You can set how long to delay before starting the first daily routine

---

## 🔗 Network & Contract Info

* **Network:** Base Sepolia Testnet
* **PRIOR Token:** `0xeFC91C5a51E8533282486FA2601dFfe0a0b16EDb`
* **USDC Token:** `0xdB07b0b4E88D9D5A79A08E91fEE20Bb41f9989a2`
* **Swap Router:** `0x8957e1988905311EE249e679a29fc9deCEd4D910`
* **Faucet Contract:** `0xa206dC56F1A56a03aEa0fCBB7c7A62b5bE1Fe419`
* **API Endpoint:** `https://priortestnet.xyz/api`

---

## ⚙️ Customization

* Modify `MAX_SWAPS_PER_WALLET` in `swap.js` to change daily swap limits
* Adjust delays and gas limits in the code if needed
* Customize Telegram summary formatting in `telegram.js`

---
## 🙏 Credits

This project is a modified version of a script originally created by [airdropinsiders](https://github.com/airdropinsiders).  
Used under the MIT License.
---

## 📝 License

Portions of this code are derived from work by airdropinsiders (https://github.com/airdropinsiders), licensed under the MIT License.


## ⚠️ Disclaimer

This bot is for educational and testing purposes only. Use at your own risk. The developers are not responsible for any losses or damages that result from using this tool.

```

---
