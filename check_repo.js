import https from 'https';

const get = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'node.js', 'Accept': 'application/vnd.github.v3+json' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  }).on('error', reject);
});

async function run() {
  const repoInfo = await get('https://api.github.com/repos/craighckby-stack/Simulation-');
  console.log('Repo Name:', repoInfo.name);
  console.log('Description:', repoInfo.description);
}

run();
