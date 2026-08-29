import readline from 'node:readline';
import { writeNonSecretConfig, setStoredPassword } from '../src/config/credentials.js';

function ask(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(`${question}: `);
    stdin.resume();
    stdin.setRawMode?.(true);
    stdin.setEncoding('utf8');

    let input = '';
    const onData = (char: string) => {
      if (char === '\n' || char === '\r' || char === '') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
        return;
      }
      if (char === '') {
        process.exit(1); // Ctrl+C
      }
      if (char === '') {
        input = input.slice(0, -1); // backspace
        return;
      }
      input += char;
    };
    stdin.on('data', onData);
  });
}

async function main() {
  console.log('RouterManager credential setup — the admin password is stored only in macOS Keychain, never on disk.\n');

  const baseUrl = await ask('Router base URL', 'https://192.168.1.1');
  const username = await ask('Admin username', 'admin');
  const password = await askHidden('Admin password (input hidden)');

  if (!password) {
    console.error('No password entered — aborting.');
    process.exit(1);
  }

  writeNonSecretConfig({ baseUrl, username });
  setStoredPassword(password);

  console.log('\nSaved. Base URL and username in .router-config.json (gitignored), password in macOS Keychain.');
  console.log('Run `npm run discover` from packages/backend to verify the credentials work against the live router.');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
