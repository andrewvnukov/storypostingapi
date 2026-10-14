import Database from 'better-sqlite3';
import { config } from './config.js';

export const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    open_id            TEXT PRIMARY KEY,
    union_id           TEXT,
    display_name       TEXT,
    avatar_url         TEXT,
    scopes             TEXT,
    access_token       TEXT NOT NULL,
    refresh_token      TEXT NOT NULL,
    access_expires_at  INTEGER NOT NULL,
    refresh_expires_at INTEGER,
    connected_at       INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    open_id         TEXT NOT NULL REFERENCES accounts(open_id) ON DELETE CASCADE,
    mode            TEXT NOT NULL,              -- 'direct' (video.publish) | 'draft' (video.upload)
    file_path       TEXT NOT NULL,
    file_size       INTEGER NOT NULL,
    title           TEXT NOT NULL DEFAULT '',
    privacy_level   TEXT,                       -- required for 'direct', NULL for 'draft'
    disable_comment INTEGER NOT NULL DEFAULT 0,
    disable_duet    INTEGER NOT NULL DEFAULT 0,
    disable_stitch  INTEGER NOT NULL DEFAULT 0,
    brand_organic   INTEGER NOT NULL DEFAULT 0, -- "Your brand"
    brand_content   INTEGER NOT NULL DEFAULT 0, -- "Branded content"
    is_aigc         INTEGER NOT NULL DEFAULT 0,
    run_at          INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'scheduled',
    publish_id      TEXT,
    tiktok_status   TEXT,
    post_url        TEXT,
    error           TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_posts_due ON scheduled_posts(status, run_at);

  CREATE TABLE IF NOT EXISTS renders (
    id          TEXT PRIMARY KEY,
    open_id     TEXT NOT NULL,
    source_url  TEXT,
    headline    TEXT NOT NULL DEFAULT '',
    narration   TEXT NOT NULL DEFAULT '',
    background  TEXT,
    voice       TEXT,
    style       TEXT,
    file_path   TEXT NOT NULL,
    duration    REAL NOT NULL DEFAULT 0,
    file_size   INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
  );
`);

export const accounts = {
  upsert(a) {
    db.prepare(`
      INSERT INTO accounts (open_id, union_id, display_name, avatar_url, scopes,
                            access_token, refresh_token, access_expires_at, refresh_expires_at, connected_at)
      VALUES (@open_id, @union_id, @display_name, @avatar_url, @scopes,
              @access_token, @refresh_token, @access_expires_at, @refresh_expires_at, @connected_at)
      ON CONFLICT(open_id) DO UPDATE SET
        union_id = excluded.union_id,
        display_name = COALESCE(excluded.display_name, accounts.display_name),
        avatar_url = COALESCE(excluded.avatar_url, accounts.avatar_url),
        scopes = excluded.scopes,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        access_expires_at = excluded.access_expires_at,
        refresh_expires_at = excluded.refresh_expires_at
    `).run(a);
  },
  updateProfile(openId, { display_name, avatar_url }) {
    db.prepare('UPDATE accounts SET display_name = ?, avatar_url = ? WHERE open_id = ?')
      .run(display_name, avatar_url, openId);
  },
  updateTokens(openId, t) {
    db.prepare(`UPDATE accounts SET access_token = ?, refresh_token = ?, access_expires_at = ?, refresh_expires_at = ?
                WHERE open_id = ?`)
      .run(t.access_token, t.refresh_token, t.access_expires_at, t.refresh_expires_at, openId);
  },
  all: () => db.prepare('SELECT * FROM accounts ORDER BY connected_at').all(),
  get: (openId) => db.prepare('SELECT * FROM accounts WHERE open_id = ?').get(openId),
  remove: (openId) => db.prepare('DELETE FROM accounts WHERE open_id = ?').run(openId),
};

export const renders = {
  create: (r) => db.prepare(`
    INSERT INTO renders (id, open_id, source_url, headline, narration, background, voice, style,
                         file_path, duration, file_size, created_at)
    VALUES (@id, @open_id, @source_url, @headline, @narration, @background, @voice, @style,
            @file_path, @duration, @file_size, @created_at)
  `).run(r),
  get: (id) => db.prepare('SELECT * FROM renders WHERE id = ?').get(id),
  recent: () => db.prepare('SELECT * FROM renders ORDER BY created_at DESC LIMIT 20').all(),
};

export const posts = {
  create(p) {
    const now = Date.now();
    const info = db.prepare(`
      INSERT INTO scheduled_posts (open_id, mode, file_path, file_size, title, privacy_level,
                                   disable_comment, disable_duet, disable_stitch,
                                   brand_organic, brand_content, is_aigc, run_at,
                                   status, created_at, updated_at)
      VALUES (@open_id, @mode, @file_path, @file_size, @title, @privacy_level,
              @disable_comment, @disable_duet, @disable_stitch,
              @brand_organic, @brand_content, @is_aigc, @run_at,
              'scheduled', ${now}, ${now})
    `).run(p);
    return info.lastInsertRowid;
  },
  due: (now) => db.prepare(
    "SELECT * FROM scheduled_posts WHERE status = 'scheduled' AND run_at <= ? ORDER BY run_at LIMIT 10"
  ).all(now),
  pending: () => db.prepare(
    "SELECT * FROM scheduled_posts WHERE status = 'uploaded' AND publish_id IS NOT NULL"
  ).all(),
  listForView: () => db.prepare(`
    SELECT p.*, a.display_name FROM scheduled_posts p
    LEFT JOIN accounts a ON a.open_id = p.open_id
    ORDER BY p.run_at DESC LIMIT 100
  `).all(),
  get: (id) => db.prepare('SELECT * FROM scheduled_posts WHERE id = ?').get(id),
  update(id, fields) {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    const set = keys.map((k) => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE scheduled_posts SET ${set}, updated_at = @updated_at WHERE id = @id`)
      .run({ ...fields, id, updated_at: Date.now() });
  },
};
