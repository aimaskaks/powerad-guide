const path = require('path');
const characters = require(path.join(process.cwd(), 'characters.json'));

const GAME_KNOWLEDGE = `
【パワアドの基本システム】
- サクセスモード「パワフルアカデミー」でキャラを育成する
- デッキは5枠。必ずマリセア（彼女候補）を1枠入れること
- 得意訓練が同じキャラを集めるとスペシャルタッグが発動し経験値効率が上がる
- スペシャルタッグは評価80以上で発動

【セクション別の立ち回り】
- セクション1：評価上げを優先。彼女＞SRキャラ複数＞SRキャラの順
- セクション2〜3：教本の目標達成＋スペシャルタッグ練習を優先
- セクション4：必殺技・スキル習得に切り替える

【ジョブ別ステータス優先度】
- 剣士：パワー最優先、次に生命力・器用さ
- 弓使い：器用さ最優先、次に生命力・パワー
- 魔法使い：魔力最優先、次に生命力・器用さ
- 魔闘士：魔力最優先、次に生命力・器用さ
- 僧侶：精神力・生命力優先
- 重戦士：生命力・器用さ優先

【デッキ編成のポイント】
- 彼女枠（マリセア）は必須
- 得意訓練を揃えてスペシャルタッグを狙う
- バトル用に必殺技・アクションスキル持ちを入れる
- 評価が高いキャラほどイベントが多く経験値効率が良い

【キャラ評価基準】
- SS：唯一無二の性能（マリセアのみ）
- S：非常に強力、優先して育てるべき
- A：強い、所持していれば積極的に使う
- B：状況次第で有用
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

【ユーザーの所持キャラ】
${JSON.stringify(ownedData, null, 2)}

【全キャラリスト】
${JSON.stringify(characters.characters.map(c => ({
  name: c.name, job: c.job, attr: c.attr, rating: c.rating, training: c.training
})), null, 2)}

以下のJSON形式で回答してください。他の文字は一切含めないでください。
{
  "recommendedParty": [
    { "name": "キャラ名", "role": "役割（アタッカー/ヒーラー/サポートなど）" }
  ],
  "partyReason": "このパーティを推奨する理由（200字程度）",
  "wantedCharacters": [
    { "name": "キャラ名", "reason": "欲しい理由（50字程度）" }
  ],
  "nextToLevel": [
    { "name": "キャラ名", "reason": "優先して育てるべき理由（50字程度）" }
  ]
}

条件：
- recommendedPartyは所持キャラの中から最大5体（マリセアを所持していれば必ず含める）
- wantedCharactersは所持していないキャラの中から優先度順に最大3体
- nextToLevelは所持キャラの中から育成優先順に最大3体
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    console.log('Gemini response status:', response.status);
    console.log('Gemini response:', JSON.stringify(data).slice(0, 500));

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
