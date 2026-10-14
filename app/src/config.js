import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Everything the app writes lives under one directory so a server deployment can
// put it on a mounted volume and leave the checkout read-only. Defaults to the
// checkout itself, which is what a local clone wants.
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : root;
const uploadDir = path.join(dataDir, 'uploads');
const backgroundsDir = path.join(dataDir, 'assets/backgrounds');
for (const dir of [uploadDir, backgroundsDir]) fs.mkdirSync(dir, { recursive: true });

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
  dataDir,
  uploadDir,
  backgroundsDir,
  dbFile: path.join(dataDir, 'data.db'),
  // Set both behind a TLS terminator such as nginx, so the session cookie is
  // marked secure and req.protocol reflects the original request.
  trustProxy: process.env.TRUST_PROXY === '1',
  cookieSecure: process.env.COOKIE_SECURE === '1',
};
