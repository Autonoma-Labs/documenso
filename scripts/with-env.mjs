import { existsSync, readFileSync } from 'node:fs';
import { delimiter } from 'node:path';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const separatorIndex = process.argv.indexOf('--');

if (separatorIndex === -1 || separatorIndex === process.argv.length - 1) {
  console.error('Usage: node scripts/with-env.mjs <env-file>... -- <command> [args...]');
  process.exit(1);
}

const envFiles = process.argv.slice(2, separatorIndex);
const command = process.argv[separatorIndex + 1];
const binPaths = [];

const parseEnvFile = (contents) => {
  const env = {};

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const normalizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
    const equalsIndex = normalizedLine.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = normalizedLine.slice(0, equalsIndex).trim();
    let value = normalizedLine.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value.replace(/\\n/g, '\n');
  }

  return env;
};

let currentDirectory = process.cwd();

while (true) {
  binPaths.push(resolve(currentDirectory, 'node_modules/.bin'));

  const parentDirectory = dirname(currentDirectory);

  if (parentDirectory === currentDirectory) {
    break;
  }

  currentDirectory = parentDirectory;
}

const runtimeEnv = { ...process.env };
let commandName = command;
let commandNameIndex = separatorIndex + 1;

for (let index = separatorIndex + 1; index < process.argv.length; index++) {
  const argument = process.argv[index];

  if (!argument.includes('=') || argument.startsWith('-')) {
    commandName = argument;
    commandNameIndex = index;
    break;
  }

  const equalsIndex = argument.indexOf('=');
  const key = argument.slice(0, equalsIndex);
  const value = argument.slice(equalsIndex + 1);

  runtimeEnv[key] = value;
}

const commandArgs = process.argv.slice(commandNameIndex + 1);

for (const envFile of envFiles) {
  const filePath = resolve(process.cwd(), envFile);

  if (!existsSync(filePath)) {
    continue;
  }

  const contents = readFileSync(filePath, 'utf8');
  const parsed = parseEnvFile(contents);

  for (const [key, value] of Object.entries(parsed)) {
    runtimeEnv[key] = value;
  }
}

const child = spawn(commandName, commandArgs, {
  env: {
    ...runtimeEnv,
    PATH: `${binPaths.join(delimiter)}${delimiter}${process.env.PATH ?? ''}`,
  },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
