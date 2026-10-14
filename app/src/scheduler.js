import fs from 'node:fs';
import cron from 'node-cron';
import { posts } from './db.js';
import { initDirectPost, initDraftUpload, uploadFile, fetchStatus } from './tiktok.js';

/**
 * One tick: send everything that is due, then refresh the status of everything
 * already handed to TikTok. Runs every minute.
 */
export async function tick() {
  for (const post of posts.due(Date.now())) {
    posts.update(post.id, { status: 'uploading', error: null });
    try {
      const init = post.mode === 'direct'
        ? await initDirectPost(post.open_id, post, post.file_size)
        : await initDraftUpload(post.open_id, post.file_size);

      await uploadFile(init.upload_url, post.file_path, post.file_size);
      posts.update(post.id, { status: 'uploaded', publish_id: init.publish_id });
    } catch (err) {
      posts.update(post.id, { status: 'failed', error: String(err.message || err) });
    }
  }

  for (const post of posts.pending()) {
    try {
      const data = await fetchStatus(post.open_id, post.publish_id);
      const fields = { tiktok_status: data.status };

      if (data.status === 'PUBLISH_COMPLETE') {
        fields.status = 'published';
        const id = data.publicaly_available_post_id?.[0];
        if (id) fields.post_url = `https://www.tiktok.com/video/${id}`;
        cleanupFile(post.file_path);
      } else if (data.status === 'FAILED') {
        fields.status = 'failed';
        fields.error = data.fail_reason || 'TikTok reported FAILED';
      }
      posts.update(post.id, fields);
    } catch (err) {
      posts.update(post.id, { error: String(err.message || err) });
    }
  }
}

function cleanupFile(filePath) {
  // The media is only needed until TikTok has it; the privacy policy promises deletion.
  fs.rm(filePath, { force: true }, () => {});
}

export function startScheduler() {
  cron.schedule('* * * * *', () => {
    tick().catch((err) => console.error('[scheduler]', err));
  });
  console.log('[scheduler] running, checks every minute');
}
