const USER_AGENT = '2ch-mystery-board/1.0 (free-web-source-bot)';

function sanitizeText(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  return sanitizeText(text)
    .split(/(?<=[。！？.!?])\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function fetchWikipediaSummary(keyword) {
  const encoded = encodeURIComponent(keyword);
  const url = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  if (!data?.extract) {
    return [];
  }

  return splitSentences(data.extract).slice(0, 3);
}

async function fetchDuckDuckGoOpinions(keyword) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(keyword)}&format=json&no_redirect=1&skip_disambig=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const lines = [];

  if (data?.AbstractText) {
    lines.push(...splitSentences(data.AbstractText));
  }

  if (Array.isArray(data?.RelatedTopics)) {
    data.RelatedTopics.forEach((topic) => {
      if (topic?.Text) {
        lines.push(sanitizeText(topic.Text));
      }
      if (Array.isArray(topic?.Topics)) {
        topic.Topics.forEach((nested) => {
          if (nested?.Text) {
            lines.push(sanitizeText(nested.Text));
          }
        });
      }
    });
  }

  return lines.filter(Boolean).slice(0, 6);
}

async function fetchOnlineInsights(topicTitle) {
  const candidates = [topicTitle, `${topicTitle} 謎`, `${topicTitle} 考察`];
  const unique = new Set();

  for (const keyword of candidates) {
    try {
      const [wiki, ddg] = await Promise.all([
        fetchWikipediaSummary(keyword),
        fetchDuckDuckGoOpinions(keyword),
      ]);
      [...wiki, ...ddg].forEach((line) => {
        if (line.length >= 16) {
          unique.add(line);
        }
      });
    } catch {
      // ネットワーク失敗時は次のキーワードへ
    }

    if (unique.size >= 8) {
      break;
    }
  }

  return Array.from(unique).slice(0, 8);
}

module.exports = {
  fetchOnlineInsights,
};
