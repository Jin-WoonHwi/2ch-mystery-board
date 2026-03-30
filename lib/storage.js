const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const LOG_FILE = path.join(DATA_DIR, 'generation.log');

// データディレクトリを確保
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 全記事を読み込み
function loadArticles() {
  ensureDataDir();
  if (!fs.existsSync(ARTICLES_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(ARTICLES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 記事を保存
function saveArticle(article) {
  ensureDataDir();
  const articles = loadArticles();
  articles.unshift(article); // 最新を先頭に
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf-8');
  return article;
}

// 記事をIDで取得
function getArticleById(id) {
  const articles = loadArticles();
  return articles.find((a) => a.id === id) || null;
}

// ログに追記
function appendLog(article) {
  ensureDataDir();
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${yyyy}/${MM}/${dd} ${hh}:${mm}:${ss}`;

  const logEntry = `[${timestamp}] タイトル: ${article.title} | カテゴリ: ${article.category} | 記事ID: ${article.id}\n`;

  fs.appendFileSync(LOG_FILE, logEntry, 'utf-8');
}

// ログを読み込み
function readLog() {
  ensureDataDir();
  if (!fs.existsSync(LOG_FILE)) {
    return 'ログファイルはまだ作成されていません。';
  }
  return fs.readFileSync(LOG_FILE, 'utf-8');
}

module.exports = {
  loadArticles,
  saveArticle,
  getArticleById,
  appendLog,
  readLog,
};
