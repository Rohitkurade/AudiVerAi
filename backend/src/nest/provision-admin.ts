import 'reflect-metadata';

import { config } from 'dotenv';
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';

import { DatabaseService } from './database.service';
import { AdminProvisioningService, isAdminProvisioningError } from './modules/auth/provisioning';

config({ path: resolve(__dirname, '../../../.env') });

async function promptSecret(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error('Administrator provisioning requires an interactive terminal.');
  }

  process.stdout.write(`${label}: `);
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.resume();

  return new Promise((resolveSecret, reject) => {
    let value = '';

    const cleanup = (): void => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };

    const onData = (chunk: string): void => {
      for (const character of chunk) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Provisioning cancelled.'));
          return;
        }

        if (character === '\r' || character === '\n') {
          cleanup();
          resolveSecret(value);
          return;
        }

        if (character === '\b' || character === '\u007f') {
          const characters = Array.from(value);
          characters.pop();
          value = characters.join('');
          continue;
        }

        const codePoint = character.codePointAt(0);
        if (codePoint !== undefined && codePoint >= 32) {
          value += character;
        }
      }
    };

    process.stdin.on('data', onData);
  });
}

async function promptLine(label: string): Promise<string> {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await prompt.question(`${label}: `);
  } finally {
    prompt.close();
  }
}

async function run(): Promise<void> {
  const fullName = await promptLine('Administrator full name');
  const email = await promptLine('Administrator email');
  const password = await promptSecret('Administrator password');
  const confirmation = await promptSecret('Confirm password');

  if (password !== confirmation) {
    throw new Error('Passwords do not match.');
  }

  const database = new DatabaseService();
  try {
    const userId = await new AdminProvisioningService(database).provisionFirstAdmin({
      fullName,
      email,
      password,
    });
    console.log(`Administrator account provisioned (user ID ${userId}).`);
  } finally {
    await database.onModuleDestroy();
  }
}

run().catch((error: unknown) => {
  if (isAdminProvisioningError(error)) {
    console.error(error.message);
  } else {
    console.error('Administrator provisioning failed. Check database connectivity and provisioning constraints.');
  }
  process.exitCode = 1;
});
