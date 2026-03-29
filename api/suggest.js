const path = require('path');
const characters = require(path.join(process.cwd(), 'characters.json'));

const GAME_KNOWLEDGE = `
【パワアドの基本システム】
- サクセスモード「パワフルアカデミー」でキャラを育成する
- デッキは6枠。必ずマリセア（彼女候補）を1枠入れること
- 得意訓練が同じキャラを集めるとスペシャルタッグが発動し経験値効率が上がる
- スペシャルタッグは評価80以上で発動
- 冒険者が選べるジョブは「剣士」「弓使い」「魔法使い」「魔闘士」の4種類のみ（僧侶・重戦士は育成対象外）

【セクション別の立ち回り】
- セクション1：評価上げを優先。彼女＞SRキャラ複数＞SRキャラの順
- セクション2〜3：教本の目標達成＋スペシャルタッグ練習を優先
- セクション4：必殺技・スキル習得に切り替える

【ジョブ別ステータス優先度と固めるべき得意訓練】
これが最も重要。育成ジョブに合わせて同じ得意訓練を持つキャラを3人固める（3人）か2:2で固める形式にすること。

- 剣士（パワー最優先）：「筋力」「持久力」「命中」の得意訓練を固める（例：持久力2人＋筋力2人など）
- 弓使い（器用さ最優先）：「命中」「瞬発力」「知能」の得意訓練を固める（例：命中3人、命中2人＋瞬発力2人など）
- 魔法使い（魔力最優先）：「知能」「メンタル」「瞬発力」の得意訓練を固める（例：知能2人＋瞬発力2人、知能3人など）
- 魔闘士（魔力最優先）：「知能」「メンタル」「瞬発力」の得意訓練を固める（例：知能2人＋メンタル2人など）

【必殺技・アクションスキルの枠について】
- 冒険者が習得できる必殺技は1つ、アクションスキルは1つのみ
- 必殺技を教えるキャラ（hissatsu）は1〜2人に抑える
- アクションスキルを教えるキャラ（action）は1〜2人に抑える
- 残りの枠はサポートスキル（support）を提供するキャラで埋める

【デッキ編成のポイント】
- 彼女枠（マリセア）は必須
- 得意訓練を揃えてスペシャルタッグを狙う
- 評価が高いキャラほどイベントが多く経験値効率が良い
`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ownedCharacters } = req.body;

  if (!ownedCharacters || ownedCharacters.length === 0) {
    return res.status(400).json({ error: 'キャラクターを選択してください' });
  }

  const ownedData = characters.characters.filter(c =>
    ownedCharacters.includes(c.name)
  );

  const prompt = `
あなたはパワプロアドベンチャーズ（パワアド）の攻略アドバイザーです。
以下のゲーム知識とユーザーの所持キャラ情報をもとに、最適なアドバイスをJSON形式で返してください。

【ゲーム知識】
${GAME_KNOWLEDGE}

【ユーザーの所持キャラ（得意訓練・skillType含む）】
${JSON.stringify(ownedData, null, 2)}

【全キャラリスト】
${JSON.stringify(characters.characters.map(c => ({
  name: c.name, job: c.job, attr: c.attr, rating: c.rating, training: c.training, skillType: c.skillType
})), null, 2)}

以下のJSON形式で回答してください。他の文字は一切含めないでください。
{
  "recommendedParties": [
    {
      "title": "【ジョブ名×属性名】（例：【剣士×火属性】、【魔法使い×水属性】）",
      "members": ["キャラ名1", "キャラ名2", "キャラ名3", "キャラ名4", "キャラ名5", "キャラ名6"],
      "reason": "得意訓練の組み合わせ（スペシャルタッグの組み方）、必殺技・アクションスキルの配置、ステータス効率を具体的に説明（200字程度）"
    }
  ],
  "wantedCharacters": [
    { "name": "キャラ名", "reason": "欲しい理由（50字程度）" }
  ],
  "nextToLevel": [
    { "name": "キャラ名", "reason": "優先して育てるべき理由（50字程度）" }
  ]
}

条件：
- recommendedPartiesは剣士・弓使い・魔法使い・魔闘士の中から、所持キャラで作れる異なるジョブ×属性の組み合わせを最大3パーティ提案する
- titleは必ず「【ジョブ名×属性名】」の形式にする
- 各パーティは必ずマリセアを含める（所持している場合）
- メンバーは6人（マリセア含む）
- 得意訓練を3人固める、または2:2で固める形式を必ず守る
- 必殺技提供キャラ（hissatsu）は1〜2人、アクションスキル提供キャラ（action）は1〜2人に抑える
- wantedCharactersは所持していないキャラの中から優先度順に最大3体
- nextToLevelは所持キャラの中から育成優先順に最大3体
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: 'Gemini APIエラー', detail: JSON.stringify(data) });
    }

    const text = data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);
  } catch (error) {
    console.error('catch error:', error);
    return res.status(500).json({ error: '診断に失敗しました。もう一度お試しください。' });
  }
};
