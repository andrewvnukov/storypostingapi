import crypto from 'node:crypto';
import fs from 'node:fs';
import { config } from './config.js';
import { accounts } from './db.js';

const AUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize/';
const API = 'https://open.tiktokapis.com/v2';

/* ------------------------------------------------------------------ OAuth */

export function buildAuthUrl() {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  // TikTok expects the PKCE challenge hex-encoded, not base64url as in plain RFC 7636.
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('hex');

  const url = new URL(AUTH_BASE);
  url.searchParams.set('client_key', config.clientKey);
  url.searchParams.set('scope', config.scopes.join(','));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  // With a live TikTok session and a grant already given, TikTok skips the
  // authorization page and comes straight back. The demo video for app review
  // has to show that page, so ask for it every time.
  if (config.disableAutoAuth) url.searchParams.set('disable_auto_auth', '1');

  return { url: url.toString(), state, codeVerifier };
}

async function tokenRequest(body) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      ...body,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`TikTok token error: ${json.error ?? res.status} ${json.error_description ?? ''}`);
  }
  const now = Date.now();
  return {
    open_id: json.open_id,
    scopes: json.scope,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    access_expires_at: now + json.expires_in * 1000,
    refresh_expires_at: json.refresh_expires_in ? now + json.refresh_expires_in * 1000 : null,
  };
}

export const exchangeCode = (code, codeVerifier) =>
  tokenRequest({
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

export const refreshToken = (token) =>
  tokenRequest({ grant_type: 'refresh_token', refresh_token: token });

/** Returns a valid access token, refreshing it a minute before expiry. */
export async function accessTokenFor(openId) {
  const account = accounts.get(openId);
  if (!account) throw new Error(`Account ${openId} is not connected`);
  if (account.access_expires_at - 60_000 > Date.now()) return account.access_token;

  const fresh = await refreshToken(account.refresh_token);
  accounts.updateTokens(openId, fresh);
  return fresh.access_token;
}

/* -------------------------------------------------------------- API calls */

async function call(openId, path, { method = 'POST', body, query } = {}) {
  const token = await accessTokenFor(openId);
  const url = new URL(`${API}${path}`);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  const err = json?.error;
  if (!res.ok || (err && err.code && err.code !== 'ok')) {
    throw new Error(`TikTok ${path} failed: ${err?.code ?? res.status} — ${err?.message ?? 'unknown error'}`);
  }
  return json.data;
}

const USER_FIELDS = [
  'open_id', 'union_id', 'avatar_url', 'display_name',
  'follower_count', 'following_count', 'likes_count', 'video_count',
].join(',');

/** Profile + lifetime stats of the connected account. */
export const getUserInfo = (openId) =>
  call(openId, '/user/info/', { method: 'GET', query: { fields: USER_FIELDS } })
    .then((d) => d.user);

const VIDEO_FIELDS = [
  'id', 'title', 'cover_image_url', 'share_url', 'create_time', 'duration',
  'view_count', 'like_count', 'comment_count', 'share_count',
].join(',');

/**
 * Videos of the connected account. The official API only exposes the account
 * that authorized the app — there is no endpoint for watching someone else's channel.
 */
export const listVideos = (openId, { cursor, maxCount = 20 } = {}) =>
  call(openId, '/video/list/', {
    query: { fields: VIDEO_FIELDS },
    body: cursor ? { max_count: maxCount, cursor } : { max_count: maxCount },
  });

/**
 * Posting options the account actually allows. Must be called right before
 * showing the publish form — TikTok requires the UI to reflect this response.
 */
export const getCreatorInfo = (openId) => call(openId, '/post/publish/creator_info/query/');

/* --------------------------------------------------------------- Publishing */

const CHUNK_LIMIT = 64 * 1024 * 1024; // TikTok's max chunk size

function chunking(fileSize) {
  // Files up to the chunk limit go up as a single chunk; larger ones are split evenly.
  if (fileSize <= CHUNK_LIMIT) {
    return { video_size: fileSize, chunk_size: fileSize, total_chunk_count: 1 };
  }
  const total = Math.floor(fileSize / CHUNK_LIMIT);
  return { video_size: fileSize, chunk_size: CHUNK_LIMIT, total_chunk_count: total };
}

/** Direct Post — needs the video.publish scope. */
export function initDirectPost(openId, post, fileSize) {
  return call(openId, '/post/publish/video/init/', {
    body: {
      post_info: {
        title: post.title ?? '',
        privacy_level: post.privacy_level,
        disable_comment: !!post.disable_comment,
        disable_duet: !!post.disable_duet,
        disable_stitch: !!post.disable_stitch,
        brand_content_toggle: !!post.brand_content,
        brand_organic_toggle: !!post.brand_organic,
        is_aigc: !!post.is_aigc,
      },
      source_info: { source: 'FILE_UPLOAD', ...chunking(fileSize) },
    },
  });
}

/** Upload to the creator's TikTok inbox as a draft — needs the video.upload scope. */
export function initDraftUpload(openId, fileSize) {
  return call(openId, '/post/publish/inbox/video/init/', {
    body: { source_info: { source: 'FILE_UPLOAD', ...chunking(fileSize) } },
  });
}

/** PUTs the file to the upload URL returned by init, one chunk at a time. */
export async function uploadFile(uploadUrl, filePath, fileSize) {
  const { chunk_size, total_chunk_count } = chunking(fileSize);

  for (let i = 0; i < total_chunk_count; i++) {
    const start = i * chunk_size;
    // The last chunk carries whatever remains, so it may exceed chunk_size.
    const end = i === total_chunk_count - 1 ? fileSize - 1 : start + chunk_size - 1;
    const buffer = await readRange(filePath, start, end);

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(buffer.length),
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      },
      body: buffer,
    });
    if (!res.ok) {
      throw new Error(`Chunk ${i + 1}/${total_chunk_count} rejected by TikTok: ${res.status} ${await res.text()}`);
    }
  }
}

function readRange(filePath, start, end) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    fs.createReadStream(filePath, { start, end })
      .on('data', (c) => chunks.push(c))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject);
  });
}

export const fetchStatus = (openId, publishId) =>
  call(openId, '/post/publish/status/fetch/', { body: { publish_id: publishId } });
