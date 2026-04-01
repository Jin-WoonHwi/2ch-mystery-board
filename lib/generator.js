const { topics, genericResponses, categoryResponses } = require('./topics');
const { collectWebOpinions } = require('./webOpinions');

// シード付き疑似乱数（日時ベースで再現可能）
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// 配列をシャッフル
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ランダムに要素を選択
function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

// 使用済みを避けてランダム選択（重複防止）
function pickUnused(arr, usedSet, rng) {
  const available = arr.filter(item => !usedSet.has(item));
  if (available.length === 0) return null; // 全て使用済み
  const chosen = available[Math.floor(rng() * available.length)];
  usedSet.add(chosen);
  return chosen;
}

// 複数ランダム選択（重複なし）
function pickMultiple(arr, count, rng) {
  const shuffled = shuffle(arr, rng);
  return shuffled.slice(0, Math.min(count, arr.length));
}

// 2ch風の名前を生成
function generateName(rng) {
  const names = [
    '名無しさん@お腹いっぱい。',
    '本当にあった怖い名無し',
    '名無しのオプ',
    '名無しさん@涙目です。',
    '名無しさん@おーぷん',
    '名無しさん@そうだ選挙に行こう',
    '名無し募集中。。。',
    '名無しステーション',
    '名無しさん@恐縮です',
    '名無し検定1級さん',
  ];
  // 95%は匿名、5%はトリップ付き
  if (rng() < 0.05) {
    const trips = ['◆XkFgMnR9qM', '◆y7pIAhz1TI', '◆History0wk', '◆OCCULTx.UE', '◆M1st3ry.ZQ'];
    return pick(names, rng) + pick(trips, rng);
  }
  return pick(names, rng);
}

// 2ch風のID生成
function generateId(rng) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let id = '';
  for (let i = 0; i < 9; i++) {
    id += chars[Math.floor(rng() * chars.length)];
  }
  return id;
}

// 記事のタイムスタンプ生成
function generateTimestamp(baseDate, offsetMinutes) {
  const d = new Date(baseDate.getTime() + offsetMinutes * 60000);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const day = days[d.getDay()];
  return `${yyyy}/${MM}/${dd}(${day}) ${hh}:${mm}:${ss}`;
}

// レス（投稿）を生成
function generatePost(num, name, id, timestamp, content, replyTo) {
  return {
    num,
    name,
    id,
    timestamp,
    content,
    replyTo: replyTo || null,
  };
}

// 記事を生成
async function generateArticle(overrideDate) {
  const now = overrideDate || new Date();
  const seed = now.getFullYear() * 10000000000 +
    (now.getMonth() + 1) * 100000000 +
    now.getDate() * 1000000 +
    now.getHours() * 10000 +
    now.getMinutes() * 100 +
    now.getSeconds() +
    Math.floor(Math.random() * 10000);
  const rng = seededRandom(seed);

  // トピックをランダム選択
  const topic = pick(topics, rng);

  // カテゴリタグ
  const categoryTag = `【${topic.category}】`;

  // スレッドタイトル生成
  const titleTemplates = [
    `${categoryTag} ${topic.title}について語るスレ`,
    `${categoryTag} ${topic.title}の真実`,
    `${categoryTag} ${topic.title}って結局どうなん？`,
    `${categoryTag} ${topic.title}を考察するスレ`,
    `${categoryTag} 【議論】${topic.title}【徹底考察】`,
    `${categoryTag} ${topic.title}に詳しいやつ来てくれ`,
    `${categoryTag} ${topic.title}の謎を解明するスレ`,
    `${categoryTag} お前らは${topic.title}をどう思う？`,
  ];
  const title = pick(titleTemplates, rng);

  // 記事ID生成
  const articleId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(Math.floor(rng() * 1000)).padStart(3, '0')}`;

  const posts = [];

  // >>1: スレ主（OP）の投稿
  const opId = generateId(rng);
  const opTimestamp = generateTimestamp(now, 0);

  const fetchedOpinions = await collectWebOpinions(topic);
  const webOpinions = fetchedOpinions.length > 0
    ? fetchedOpinions
    : pickMultiple(topic.responses, Math.min(5, topic.responses.length), rng).map((r) => `掲示板でよく見る意見: ${r}`);

  // OP本文を構築
  let opBody = topic.summary + '\n\n';
  opBody += '■主なポイント\n';
  topic.keyPoints.forEach((p) => {
    opBody += `・${p}\n`;
  });
  opBody += '\n■主な説\n';
  const selectedTheories = pickMultiple(topic.theories, Math.min(3, topic.theories.length), rng);
  selectedTheories.forEach((t) => {
    opBody += `・${t}\n`;
  });
  if (webOpinions.length > 0) {
    opBody += '\n■ネット上で見られる意見・考察\n';
    webOpinions.slice(0, 3).forEach((op) => {
      opBody += `・${op}\n`;
    });
  }
  opBody += '\nお前らの考えを聞かせてくれ';

  posts.push(generatePost(1, '1 ◆Thread0pnr', opId, opTimestamp, opBody));

  // レス数を決定（25〜50）
  const totalPosts = 25 + Math.floor(rng() * 26);
  let minuteOffset = 1;

  // 使用済みコンテンツを追跡（重複防止）
  const usedTopicResponses = new Set();
  const usedGenericResponses = new Set();
  const usedCategoryResponses = new Set();
  const usedFacts = new Set();
  const usedTheories = new Set();
  const usedReplyTexts = new Set();
  const usedWebOpinions = new Set();

  // 返信テンプレート（本文部分のみ。レス番号は動的に付与）
  const replyTemplates = [
    'それな。俺もそう思う',
    'いや、それは違うだろ',
    'kwsk',
    'ソースは？',
    'それ初めて聞いたわ。マジなん？',
    'わかる。俺も同じこと考えてた',
    'それはさすがに飛躍しすぎだろ',
    '天才か？',
    'これが正解だと思う',
    '詳しすぎて草',
    'めちゃくちゃ分かりやすい説明だな',
    'なるほど、そういう見方もあるのか',
    'ちょっと待て、それマジで言ってる？',
    'その発想はなかったわ',
    '激しく同意',
    'お前よく知ってるな。何者だよ',
    'え、そうだったの？知らなかった',
    'まあ一理あるけど、それだけじゃないだろ',
    'これはいい考察',
    'そこが一番気になるポイントだよな',
  ];

  // 各レスを生成
  for (let i = 2; i <= totalPosts; i++) {
    minuteOffset += 1 + Math.floor(rng() * 15);
    const name = generateName(rng);
    const id = generateId(rng);
    const ts = generateTimestamp(now, minuteOffset);

    let content = '';
    let replyTo = null;

    // カテゴリの確率を決定し、使用済みの場合はフォールバック
    const roll = rng();
    let generated = false;

    if (roll < 0.35 && topic.responses.length > 0) {
      // トピック固有レスポンス
      const resp = pickUnused(topic.responses, usedTopicResponses, rng);
      if (resp) {
        content = resp;
        generated = true;
      }
    }

    if (!generated && roll < 0.50) {
      // 事実を紹介するレス
      const fact = pickUnused(topic.facts, usedFacts, rng);
      if (fact) {
        const intros = [
          'ちなみに豆知識だけど、',
          '補足すると、',
          'これ知ってるか？ ',
          '参考までに。',
          'マジレスすると、',
          'ガチの情報だけど、',
          'あまり知られてないけど、',
        ];
        content = pick(intros, rng) + fact;
        generated = true;
      }
    }

    if (!generated && roll < 0.65) {
      // 理論を紹介するレス
      const theory = pickUnused(topic.theories, usedTheories, rng);
      if (theory) {
        const intros = [
          '個人的には「',
          'ワイは「',
          '最近有力なのは「',
          '一番説得力あるのは「',
          '俺が推してるのは「',
          'ぶっちゃけ「',
        ];
        content = pick(intros, rng) + theory + '」だと思ってる';
        generated = true;
      }
    }

    if (!generated && roll < 0.80) {
      // 別のレスへの返信
      if (i > 3) {
        const targetNum = 1 + Math.floor(rng() * (i - 1));
        const replyText = pickUnused(replyTemplates, usedReplyTexts, rng);
        if (replyText) {
          replyTo = targetNum;
          content = `>>${targetNum}\n${replyText}`;
          generated = true;
        }
      }
    }

    if (!generated && roll < 0.90 && webOpinions.length > 0) {
      const webOpinion = pickUnused(webOpinions, usedWebOpinions, rng);
      if (webOpinion) {
        content = `ネットで見かけた意見だけど\n「${webOpinion}」\nこれ結構核心ついてる気がする`;
        generated = true;
      }
    }

    if (!generated) {
      // 汎用またはカテゴリ別レスポンスにフォールバック
      const catResps = categoryResponses[topic.category] || [];
      let resp = pickUnused(catResps, usedCategoryResponses, rng);
      if (!resp) {
        resp = pickUnused(genericResponses, usedGenericResponses, rng);
      }
      if (resp) {
        content = resp;
      } else {
        // 全ての選択肢を使い切った場合、返信として生成
        if (i > 3) {
          const targetNum = 1 + Math.floor(rng() * (i - 1));
          replyTo = targetNum;
          // 使用済みリセットして再利用可能に
          usedReplyTexts.clear();
          const replyText = pickUnused(replyTemplates, usedReplyTexts, rng);
          content = `>>${targetNum}\n${replyText}`;
        } else {
          usedGenericResponses.clear();
          content = pickUnused(genericResponses, usedGenericResponses, rng) || 'age';
        }
      }
    }

    posts.push(generatePost(i, name, id, ts, content, replyTo));
  }

  return {
    id: articleId,
    title,
    category: topic.category,
    topicTitle: topic.title,
    createdAt: now.toISOString(),
    postCount: posts.length,
    posts,
  };
}

module.exports = { generateArticle };
