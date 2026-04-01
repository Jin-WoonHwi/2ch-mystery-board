const DEFAULT_TIMEOUT_MS = 8000;

function stripHtml(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractResults(html, limit) {
  const blocks = html.split('<div class="result results_links results_links_deep web-result">');
  const results = [];

  for (const block of blocks) {
    if (results.length >= limit) break;

    const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const sourceMatch = block.match(/class="result__url"[^>]*>([\s\S]*?)<\/span>/);

    if (!titleMatch || !snippetMatch) continue;

    const title = stripHtml(titleMatch[1]);
    const snippet = stripHtml(snippetMatch[1]);
    const source = sourceMatch ? stripHtml(sourceMatch[1]) : 'Web';

    if (!title || !snippet) continue;

    results.push({ title, snippet, source });
  }

  return results;
}

async function searchWebOpinions(topicTitle, category, limit = 4) {
  const query = `${topicTitle} ${category} 考察 意見`;
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; mystery-board-bot/1.0)',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      return [];
    }

    const html = await res.text();
    return extractResults(html, limit);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  searchWebOpinions,
};
