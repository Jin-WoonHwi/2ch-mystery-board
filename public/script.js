// ===== スレッド一覧ページ =====

// 管理者モード判定（URLに ?admin=true がある場合のみ管理機能を表示）
var isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
if (isAdmin) {
  document.querySelectorAll('.admin-only').forEach(function(el) { el.style.display = ''; });
}

let allArticles = [];
let currentFilter = 'all';

// カテゴリのCSSクラスを返す
function getCategoryClass(category) {
  if (category.includes('日本史')) return 'cat-japan';
  if (category.includes('世界史')) return 'cat-world';
  if (category.includes('都市伝説') || category.includes('陰謀論')) return 'cat-urban';
  if (category.includes('怖い話')) return 'cat-scary';
  return '';
}

// 日時のフォーマット
function formatDate(isoStr) {
  const d = new Date(isoStr);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return yyyy + '/' + MM + '/' + dd + ' ' + hh + ':' + mm;
}

// スレッド一覧を描画
function renderThreadList(articles) {
  const list = document.getElementById('threadList');
  const count = document.getElementById('threadCount');

  const filtered = currentFilter === 'all'
    ? articles
    : articles.filter(a => a.category === currentFilter);

  count.textContent = filtered.length;

  if (filtered.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">スレッドがありません。</div>';
    return;
  }

  list.innerHTML = filtered.map((a, i) => {
    const catClass = getCategoryClass(a.category);
    const shortCat = a.category.replace('都市伝説・陰謀論', '都市伝説');
    return '<div class="thread-item" onclick="location.href=\'/article/' + a.id + '\'">' +
      '<span class="thread-num">' + (i + 1) + ':</span>' +
      '<span class="thread-category ' + catClass + '">' + shortCat + '</span>' +
      '<span class="thread-title"><a href="/article/' + a.id + '">' + escapeHtml(a.title) + '</a></span>' +
      '<span class="thread-count">(' + a.postCount + ')</span>' +
      '<span class="thread-date">' + formatDate(a.createdAt) + '</span>' +
      '</div>';
  }).join('');
}

// HTMLエスケープ
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// 記事一覧を取得
function loadArticles() {
  fetch('/api/articles')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      allArticles = data;
      renderThreadList(allArticles);
    })
    .catch(function() {
      document.getElementById('threadList').innerHTML =
        '<div style="padding:20px;text-align:center;color:#c00;">読み込みに失敗しました。サーバーが起動しているか確認してください。</div>';
    });
}

// フィルターボタンのイベント
document.querySelectorAll('.filter-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentFilter = btn.dataset.category;
    renderThreadList(allArticles);
  });
});

// 手動生成ボタン
document.getElementById('generateBtn').addEventListener('click', function() {
  var btn = this;
  btn.disabled = true;
  btn.textContent = '生成中...';
  fetch('/api/generate', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      btn.disabled = false;
      btn.textContent = '記事を生成';
      if (data.success) {
        loadArticles();
      } else {
        alert('生成に失敗しました: ' + (data.error || '不明なエラー'));
      }
    })
    .catch(function() {
      btn.disabled = false;
      btn.textContent = '記事を生成';
      alert('生成に失敗しました。サーバーが起動しているか確認してください。');
    });
});

// 初回読み込み
loadArticles();
