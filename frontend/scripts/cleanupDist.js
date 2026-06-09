import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const targetDir = path.resolve('dist');

async function removeNulFiles(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    return;
  }

  await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await removeNulFiles(fullPath);
      return;
    }
    if (entry.isFile() && entry.name.toLowerCase() === 'nul') {
      try {
        await rm(fullPath, { force: true });
      } catch (error) {
        // Ignore failures on Windows reserved names
      }
    }
  }));
}

await removeNulFiles(targetDir);
