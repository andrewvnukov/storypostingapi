const form = document.getElementById('studio');
const urlInput = document.getElementById('source_url');
const headline = document.getElementById('headline');
const narration = document.getElementById('narration');
const status = document.getElementById('fetch-status');

document.getElementById('fetch').addEventListener('click', async () => {
  if (!urlInput.value.trim()) return;
  status.textContent = 'Loading the post from Reddit…';
  try {
    const res = await fetch('/story/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    headline.value = data.headline;
    narration.value = data.text;
    status.textContent = `Loaded from ${data.subreddit}${data.nsfw ? ' — marked NSFW on Reddit, check it before posting' : ''}`;
    count();
  } catch (err) {
    status.textContent = err.message;
  }
});

// ~15 characters per second is close enough for a read-aloud estimate.
function count() {
  document.getElementById('chars').textContent = narration.value.length;
  document.getElementById('estimate').textContent = Math.round(narration.value.length / 15);
}
narration.addEventListener('input', count);
count();

form.addEventListener('submit', () => {
  document.getElementById('render').disabled = true;
  document.getElementById('render-status').hidden = false;
});
