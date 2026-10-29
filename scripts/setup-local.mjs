import { constants, copyFileSync, mkdirSync } from 'node:fs';

const directory = new URL('../.openai/', import.meta.url);
mkdirSync(directory, { recursive: true });
try {
  copyFileSync(
    new URL('hosting.example.json', directory),
    new URL('hosting.json', directory),
    constants.COPYFILE_EXCL,
  );
  console.log('Created local hosting configuration from the public template.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
