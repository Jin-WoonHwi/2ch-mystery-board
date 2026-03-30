// ===== 管理者ダッシュボード =====

var isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

if (!isAdmin) {
  document.getElementById('accessDenied').style.display = '';
} else {
  document.getElementById('dashboard').style.display = '';
  loadDashboard();
  setInterval(loadDashboard, 60000);
}

function escapeHtml(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function getCategoryClass(category) {
  if (category.includes('日本史')) return 'cat-japan';
  if (category.includes('世界史')) return 'cat-world';
  if (category.includes('都市伝説') || category.includes('陰謀論')) return 'cat-urban';
  if (category.includes('怖い話')) return 'cat-scary';
  return '';
}

function loadDashboard() {
  // アナリティクスとログを並行取得
  Promise.all([
    fetch('/api/analytics?admin=true').then(function(r) { return r.json(); }),
    fetch('/api/log').then(function(r) { return r.json(); }),
  ])
    .then(function(results) {
      var data = results[0];
      var logData = results[1];
      renderSummary(data);
      renderDailyTrend(data.dailyTrend);
      renderPopularArticles(data.popularArticles);
      renderCategoryStats(data.categoryStats);
      renderLog(logData.log);
    })
    .catch(function(err) {
      console.error('Dashboard load error:', err);
    });
}

function renderSummary(data) {
  document.getElementById('totalVisitors').textContent = data.totalVisitors.toLocaleString();
  document.getElementById('todayVisitors').textContent = data.todayVisitors.toLocaleString();
  document.getElementById('totalPageViews').textContent = data.totalPageViews.toLocaleString();
  document.getElementById('todayPageViews').textContent = data.todayPageViews.toLocaleString();
  document.getElementById('totalArticles').textContent = data.totalArticles.toLocaleString();
}

function renderDailyTrend(trend) {
  var el = document.getElementById('dailyTrend');
  if (!trend || trend.length === 0) {
    el.innerHTML = '<div style="padding:16px;color:#888;text-align:center;">データがありません</div>';
    return;
  }

  var maxViews = Math.max.apply(null, trend.map(function(d) { return d.views; }));
  if (maxViews === 0) maxViews = 1;

  var html = '<table class="trend-table">';
  html += '<tr><th>日付</th><th>PV</th><th>訪問者</th><th>PV推移</th></tr>';
  trend.forEach(function(day) {
    var pct = Math.round((day.views / maxViews) * 100);
    var dateLabel = day.date.substring(5); // MM-DD
    html += '<tr>';
    html += '<td class="trend-date">' + dateLabel + '</td>';
    html += '<td class="trend-num">' + day.views + '</td>';
    html += '<td class="trend-num">' + day.visitors + '</td>';
    html += '<td class="trend-bar-cell"><div class="bar-fill" style="width:' + pct + '%">' + (pct > 15 ? day.views : '') + '</div></td>';
    html += '</tr>';
  });
  html += '</table>';
  el.innerHTML = html;
}

function renderPopularArticles(articles) {
  var el = document.getElementById('popularArticles');
  if (!articles || articles.length === 0) {
    el.innerHTML = '<div style="padding:16px;color:#888;text-align:center;">まだ閲覧データがありません</div>';
    return;
  }

  var html = '<table class="ranking-table">';
  html += '<tr><th>順位</th><th>カテゴリ</th><th>記事タイトル</th><th>PV</th></tr>';
  articles.forEach(function(a, i) {
    var catClass = getCategoryClass(a.category);
    var shortCat = (a.category || '').replace('都市伝説・陰謀論', '都市伝説');
    html += '<tr>';
    html += '<td class="rank-num">' + (i + 1) + '</td>';
    html += '<td><span class="thread-category ' + catClass + '">' + escapeHtml(shortCat) + '</span></td>';
    html += '<td class="rank-title"><a href="/article/' + escapeHtml(a.articleId) + '?admin=true">' + escapeHtml(a.title) + '</a></td>';
    html += '<td class="rank-views">' + a.views + '</td>';
    html += '</tr>';
  });
  html += '</table>';
  el.innerHTML = html;
}

function renderCategoryStats(stats) {
  var el = document.getElementById('categoryStats');
  if (!stats || Object.keys(stats).length === 0) {
    el.innerHTML = '<div style="padding:16px;color:#888;text-align:center;">記事がありません</div>';
    return;
  }

  var entries = Object.entries(stats).sort(function(a, b) { return b[1] - a[1]; });
  var maxCount = entries[0][1] || 1;

  var html = '<table class="trend-table">';
  html += '<tr><th>カテゴリ</th><th>記事数</th><th>割合</th></tr>';
  entries.forEach(function(entry) {
    var cat = entry[0];
    var count = entry[1];
    var catClass = getCategoryClass(cat);
    var pct = Math.round((count / maxCount) * 100);
    html += '<tr>';
    html += '<td><span class="thread-category ' + catClass + '">' + escapeHtml(cat) + '</span></td>';
    html += '<td class="trend-num">' + count + '</td>';
    html += '<td class="trend-bar-cell"><div class="bar-fill bar-fill-cat ' + catClass + '-bar" style="width:' + pct + '%">' + count + '</div></td>';
    html += '</tr>';
  });
  html += '</table>';
  el.innerHTML = html;
}

function renderLog(log) {
  var el = document.getElementById('recentLog');
  if (!log || !log.trim()) {
    el.textContent = 'ログはまだありません。';
    return;
  }
  // 最新20件を表示
  var lines = log.trim().split('\n');
  var recent = lines.slice(-20).reverse().join('\n');
  el.textContent = recent;
}
