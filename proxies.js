const fs = require('fs');

function loadProxies() {
  try {
    const proxyFile = fs.readFileSync('./proxies.txt', 'utf8');
    return proxyFile
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    console.warn('[!] No proxy file found or failed to read proxies.txt');
    return [];
  }
}

module.exports = { loadProxies };
