import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env (copy .env.example and fill it in)`);
  return value;
}

export const config = {
  root,
  port: Number(process.env.PORT || 3000),
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret',
  clientKey: required('TIKTOK_CLIENT_KEY'),
  clientSecret: required('TIKTOK_CLIENT_SECRET'),
  redirectUri: required('TIKTOK_REDIRECT_URI'),
  scopes: (process.env.TIKTOK_SCOPES || 'user.info.basic,video.upload,video.publish')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  uploadDir: path.join(root, 'uploads'),
  dbFile: path.join(root, 'data.db'),
};
