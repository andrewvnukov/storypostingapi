/**
 * Reads a public Reddit post through Reddit's own JSON endpoint.
 * Only the post itself is read — no comments, no user data, nothing is stored
 * beyond the text the user chooses to narrate.
 */
const UA = 'StoryPostingApi/1.0 (TikTok publishing tool)';

export function normalizeUrl(input) {
  const url = new URL(input.trim());
  if (!/(^|\.)reddit\.com$/.test(url.hostname)) {
    throw new Error('That is not a reddit.com link');
  }
  url.hostname = 'www.reddit.com';
  url.search = '';
  url.pathname = url.pathname.replace(/\/$/, '') + '.json';
  return url.toString();
}

export async function fetchPost(input) {
  const res = await fetch(normalizeUrl(input), { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Reddit returned ${res.status}. Is the post public?`);

  const json = await res.json();
  const post = json?.[0]?.data?.children?.[0]?.data;
  if (!post) throw new Error('No post found at that link');

  return {
    title: post.title ?? '',
    body: (post.selftext ?? '').replace(/&amp;#x200B;/g, '').trim(),
    author: post.author ?? '',
    subreddit: post.subreddit_name_prefixed ?? '',
    nsfw: !!post.over_18,
    url: `https://www.reddit.com${post.permalink}`,
  };
}

/** Text that actually gets narrated, with Reddit shorthand spelled out. */
export function toNarration({ title, body }) {
  const expand = (s) => s
    .replace(/\bAITA\b/g, 'Am I the asshole')
    .replace(/\bTIFU\b/g, "Today I fucked up")
    .replace(/\bOP\b/g, 'original poster')
    .replace(/\bEdit:/gi, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [expand(title), expand(body)].filter(Boolean).join('. ');
}
