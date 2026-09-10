import {existsSync} from 'node:fs';

if (process.env.NODE_ENV !== 'production' && existsSync('.git')) {
  const husky = (await import('husky')).default;
  console.log(husky());
}
