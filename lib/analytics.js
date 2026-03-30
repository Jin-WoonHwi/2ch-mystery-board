const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const MAX_PAGE_VIEWS = 10000;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAnalytics() {
  ensureDataDir();
  if (!fs.existsSync(ANALYTICS_FILE)) {
    return { visitors: {}, pageViews: [], dailyStats: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf-8'));
  } catch {
    return { visitors: {}, pageViews: [], dailyStats: {} };
  }
}

function saveAnalytics(data) {
  ensureDataDir();
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ページビューを記録
function recordPageView(ip, pagePath, userAgent) {
  const data = loadAnalytics();
  const now = new Date().toISOString();
  const today = getTodayKey();

  // 訪問者情報を更新
  if (!data.visitors[ip]) {
    data.visitors[ip] = { firstSeen: now, lastSeen: now, visits: 1 };
  } else {
    data.visitors[ip].lastSeen = now;
    data.visitors[ip].visits += 1;
  }

  // ページビューを追加
  data.pageViews.push({ path: pagePath, ip, timestamp: now, userAgent: userAgent || '' });

  // 古いページビューをトリム（30日以上前を削除）
  if (data.pageViews.length > MAX_PAGE_VIEWS) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    data.pageViews = data.pageViews.filter(pv => pv.timestamp >= cutoff);
  }

  // 日別統計を更新
  if (!data.dailyStats[today]) {
    data.dailyStats[today] = { uniqueIPs: [], viewCount: 0 };
  }
  data.dailyStats[today].viewCount += 1;
  if (!data.dailyStats[today].uniqueIPs.includes(ip)) {
    data.dailyStats[today].uniqueIPs.push(ip);
  }

  saveAnalytics(data);
}

// アナリティクスのサマリーを取得
function getAnalyticsSummary(articles) {
  const data = loadAnalytics();
  const today = getTodayKey();
  const todayStats = data.dailyStats[today] || { uniqueIPs: [], viewCount: 0 };

  // 人気記事を集計
  const articleViews = {};
  data.pageViews.forEach(pv => {
    const match = pv.path.match(/^\/article\/(\d+)/);
    if (match) {
      const id = match[1];
      articleViews[id] = (articleViews[id] || 0) + 1;
    }
  });

  const popularArticles = Object.entries(articleViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, views]) => {
      const article = articles.find(a => a.id === id);
      return {
        articleId: id,
        title: article ? article.title : '(削除済み)',
        category: article ? article.category : '',
        views,
      };
    });

  // カテゴリ別記事数
  const categoryStats = {};
  articles.forEach(a => {
    categoryStats[a.category] = (categoryStats[a.category] || 0) + 1;
  });

  // 過去7日間のトレンド
  const dailyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const stats = data.dailyStats[key] || { uniqueIPs: [], viewCount: 0 };
    dailyTrend.push({
      date: key,
      views: stats.viewCount,
      visitors: stats.uniqueIPs.length,
    });
  }

  return {
    totalVisitors: Object.keys(data.visitors).length,
    todayVisitors: todayStats.uniqueIPs.length,
    totalPageViews: data.pageViews.length,
    todayPageViews: todayStats.viewCount,
    totalArticles: articles.length,
    popularArticles,
    categoryStats,
    dailyTrend,
  };
}

module.exports = { recordPageView, getAnalyticsSummary };
