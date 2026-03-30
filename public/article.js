// ===== 記事詳細ページ =====

// 管理者モード判定
var isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
if (isAdmin) {
  document.querySelectorAll('.admin-only').forEach(function(el) { el.style.display = ''; });
}

// URLからIDを取得
var pathParts = window.location.pathname.split('/');
var articleId = pathParts[pathParts.length - 1];

// HTMLエスケープ
function escapeHtml(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// 投稿本文のフォーマット（>>レス番号のリンク化、引用の色付け）
function formatPostBody(text) {
  var escaped = escapeHtml(text);

  // >>番号 をリンクに変換
  escaped = escaped.replace(/&gt;&gt;(\d+)/g, '<a class="reply-link" href="#post-$1" onclick="highlightPost($1)">&gt;&gt;$1</a>');

  // 行頭の>をグリーンテキストに
  escaped = escaped.replace(/^(&gt;[^\n<]*)/gm, '<span class="greentext">$1</span>');

  return escaped;
}

// 投稿をハイライト
function highlightPost(num) {
  // 既存のハイライトを消す
  document.querySelectorAll('.post.highlighted').forEach(function(el) {
    el.classList.remove('highlighted');
    el.style.backgroundColor = '';
  });

  var target = document.getElementById('post-' + num);
  if (target) {
    target.style.backgroundColor = '#ffffcc';
    target.classList.add('highlighted');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function() {
      target.style.backgroundColor = '';
      target.classList.remove('highlighted');
    }, 3000);
  }
}

// 記事を読み込んで描画
fetch('/api/articles/' + articleId)
  .then(function(r) { return r.json(); })
  .then(function(article) {
    if (!article || article.error) {
      document.getElementById('threadContent').innerHTML =
        '<div style="padding:40px;text-align:center;color:#c00;">記事が見つかりませんでした。</div>';
      return;
    }

    document.title = article.title + ' - 謎と怪異の掲示板';

    var html = '';

    // スレッドヘッダー
    html += '<div class="thread-header">';
    html += '<h2>' + escapeHtml(article.title) + '</h2>';
    html += '<div class="meta">' + article.postCount + 'レス | ' + new Date(article.createdAt).toLocaleString('ja-JP') + '</div>';
    html += '</div>';

    // 各投稿を描画
    article.posts.forEach(function(post) {
      var nameClass = post.name.includes('◆') ? 'post-name trip' : 'post-name';

      html += '<div class="post" id="post-' + post.num + '">';
      html += '<div class="post-header">';
      html += '<span class="post-num" onclick="highlightPost(' + post.num + ')">' + post.num + '</span>';
      html += '<span class="' + nameClass + '">：' + escapeHtml(post.name) + '</span>';
      html += '<span class="post-date">' + escapeHtml(post.timestamp) + '</span>';
      html += '<span class="post-id">ID:' + escapeHtml(post.id) + '</span>';
      html += '</div>';
      html += '<div class="post-body">' + formatPostBody(post.content) + '</div>';
      html += '</div>';
    });

    document.getElementById('threadContent').innerHTML = html;
  })
  .catch(function() {
    document.getElementById('threadContent').innerHTML =
      '<div style="padding:40px;text-align:center;color:#c00;">読み込みに失敗しました。</div>';
  });
