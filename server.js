const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { generateArticle } = require('./lib/generator');
const { loadArticles, saveArticle, getArticleById, appendLog, readLog } = require('./lib/storage');
const { recordPageView, getAnalyticsSummary } = require('./lib/analytics');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'true';

// リバースプロキシ対応（Render等）
app.set('trust proxy', true);

// 静的ファイル配信（キャッシュ設定付き）
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));

// アクセス解析ミドルウェア（静的ファイル以外のGETリクエストを記録）
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/analytics')) {
    const ip = req.headers['x-forwarded-for'] || req.ip;
    recordPageView(ip, req.path, req.headers['user-agent'] || '');
  }
  next();
});

// ===== API ルート =====

// 記事一覧取得
app.get('/api/articles', (req, res) => {
  const articles = loadArticles();
  // 一覧用に posts を除外（軽量化）
  const list = articles.map(a => ({
    id: a.id,
    title: a.title,
    category: a.category,
    topicTitle: a.topicTitle,
    createdAt: a.createdAt,
    postCount: a.postCount,
  }));
  res.json(list);
});

// 記事詳細取得
app.get('/api/articles/:id', (req, res) => {
  const article = getArticleById(req.params.id);
  if (!article) {
    return res.status(404).json({ error: '記事が見つかりません' });
  }
  res.json(article);
});

// 管理者認証ヘルパー
function isAdmin(req) {
  return req.query.admin === ADMIN_KEY;
}

// 手動記事生成（管理者のみ）
app.post('/api/generate', (req, res) => {
  try {
    const article = generateArticle();
    saveArticle(article);
    appendLog(article);
    console.log(`[生成完了] ${article.title} (${article.category})`);
    res.json({ success: true, article: { id: article.id, title: article.title } });
  } catch (err) {
    console.error('[生成エラー]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ログ取得
app.get('/api/log', (req, res) => {
  const log = readLog();
  res.json({ log });
});

// アナリティクス取得（管理者のみ）
app.get('/api/analytics', (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'アクセス権限がありません' });
  }
  const articles = loadArticles();
  const summary = getAnalyticsSummary(articles);
  res.json(summary);
});

// ===== HTML ルーティング =====

// 記事詳細ページ
app.get('/article/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'article.html'));
});

// 管理者ダッシュボード
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ログページ
app.get('/log', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'log.html'));
});

// トップページ（フォールバック）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== cronスケジューラー =====
// 毎時00分と30分に記事を自動生成（0:00〜23:30）
cron.schedule('0,30 0-23 * * *', () => {
  const now = new Date();
  const hour = now.getHours();
  const min = String(now.getMinutes()).padStart(2, '0');
  console.log(`[cron] ${hour}:${min} - 記事自動生成を開始...`);

  try {
    const article = generateArticle();
    saveArticle(article);
    appendLog(article);
    console.log(`[cron] 生成完了: ${article.title}`);
  } catch (err) {
    console.error(`[cron] 生成エラー:`, err);
  }
});

// ===== セルフping（Render無料プランのスリープ防止） =====
if (process.env.RENDER_EXTERNAL_URL) {
  const https = require('https');
  const http = require('http');
  setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL;
    const client = url.startsWith('https') ? https : http;
    client.get(url, () => {}).on('error', () => {});
  }, 14 * 60 * 1000); // 14分ごと
}

// ===== サーバー起動 =====
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  謎と怪異の掲示板');
  console.log('  2ch風オカルト・歴史ミステリー掲示板');
  console.log('========================================');
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('  自動生成: 毎時00分・30分 (0:00〜23:30)');
  console.log('  手動生成: POST /api/generate');
  console.log('========================================');
  console.log('');
});
