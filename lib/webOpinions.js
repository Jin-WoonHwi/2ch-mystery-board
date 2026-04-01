const USER_AGENT = 'Mozilla/5.0 (compatible; MysteryBoardBot/1.0; +https://example.com/bot)';

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function normalizeSnippet(text) {
  return decodeHtml(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchDuckDuckGoSnippets(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      'accept-language': 'ja,en-US;q=0.8,en;q=0.6',
    },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo request failed: ${response.status}`);
  }

  const html = await response.text();
  const snippets = [];
  const regex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = normalizeSnippet(match[1]);
    if (text && text.length >= 20) {
      snippets.push(text);
    }
    if (snippets.length >= 8) break;
  }

  return snippets;
}

async function collectWebOpinions(topic) {
  const q = `${topic.title} 考察 意見`; 
  try {
    const snippets = await fetchDuckDuckGoSnippets(q);
    return snippets.slice(0, 5);
  } catch {
    return [];
  }
}

module.exports = { collectWebOpinions };
