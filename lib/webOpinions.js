const { URLSearchParams } = require('url');

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': '2ch-mystery-board/1.0 (+https://example.local)',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function cleanText(text) {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeOpinion(text) {
  const t = cleanText(text)
    .replace(/^\d+\.?\s*/, '')
    .replace(/^[\[\(].*?[\]\)]\s*/, '')
    .trim();

  if (!t) return null;
  if (t.length < 24) return null;
  if (/^https?:\/\//i.test(t)) return null;

  return t.length > 140 ? `${t.slice(0, 140)}...` : t;
}

function walkRelatedTopics(relatedTopics, bucket) {
  if (!Array.isArray(relatedTopics)) return;
  relatedTopics.forEach((item) => {
    if (item.Text) {
      const normalized = normalizeOpinion(item.Text);
      if (normalized) bucket.push(normalized);
    }
    if (Array.isArray(item.Topics)) {
      walkRelatedTopics(item.Topics, bucket);
    }
  });
}

async function fetchDuckDuckGoOpinions(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    no_html: '1',
    skip_disambig: '1',
  });

  const url = `https://api.duckduckgo.com/?${params.toString()}`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();

  const collected = [];
  if (data.AbstractText) {
    const normalized = normalizeOpinion(data.AbstractText);
    if (normalized) collected.push(normalized);
  }
  if (data.Answer) {
    const normalized = normalizeOpinion(data.Answer);
    if (normalized) collected.push(normalized);
  }
  walkRelatedTopics(data.RelatedTopics, collected);

  return Array.from(new Set(collected));
}

async function fetchOnlineOpinions(topic, limit = 4) {
  try {
    const query = `${topic.title} 考察 意見`;
    const opinions = await fetchDuckDuckGoOpinions(query);
    return opinions.slice(0, limit);
  } catch (error) {
    console.warn('[online-opinion] 取得失敗:', topic.title, error.message);
    return [];
  }
}

module.exports = {
  fetchOnlineOpinions,
};
