const path = require('path');
const fs = require('fs');

const KNOWLEDGE = fs.readFileSync(path.join(process.cwd(), 'knowledge.txt'), 'utf-8');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ownedCharacters, targetJob, targetAttr } = req.body;

  if (!ownedCharacters || ownedCharacters.length === 0) {
    return res.status(400).json({ error: 'キャラクターを選択してください' });
  }

  const isTargetMode = !!(targetJob && targetAttr);

  const prompt = isTargetMode ? `
あなたはパワプロアドベンチャーズ（パワアド）の最高の攻略アドバイザーです。
以下の攻略ナレッジベースを完全に理解した上で、ユーザーが指定したジョブ×属性の組み合わせに最適なパーティをJSON形式で返してください。

===== 攻略ナレッジベース =====
${KNOWLEDGE}
================================

===== ユーザーの所持キャラ =====
${ownedCharacters.join('、')}
================================

===== 育てたいジョブ×属性 =====
ジョブ：${targetJob}
属性：${targetAttr}
================================

以下のJSON形式のみで回答してください。前置き・後書き・マークダウン記号は一切不要です。

{
  "recommendedParties": [
    {
      "title": "【${targetJob}×${targetAttr}属性】",
      "members": ["キャラ名1", "キャラ名2", "キャラ名3", "キャラ名4", "キャラ名5", "キャラ名6"],
      "trainingCombo": "得意訓練の組み合わせ説明",
      "reason": "【${targetJob}×${targetAttr}属性】育成に向けた得意訓練のシナジーとスペシャルタッグ効率を中心に150字程度で説明。スキル名は一切記載しないこと"
    }
  ],
  "wantedCharacters": [
    { "name": "キャラ名", "reason": "【${targetJob}×${targetAttr}属性】育成において：得意訓練・スキル・属性の観点からパーティのどこを補強できるか具体的に100字程度で説明" }
  ],
  "nextToLevel": [
    { "name": "キャラ名", "reason": "育成優先理由：このキャラを育てることで【${targetJob}×${targetAttr}属性】のどの得意訓練タッグが成立し、どのスキルが取得できるか具体的に100字程度で説明" }
  ]
}

厳守事項：
- titleは必ず「【${targetJob}×${targetAttr}属性】」で固定
- 所持キャラの中から【${targetJob}×${targetAttr}属性】の冒険者育成に最も適したパーティを1つ提案
- マリセアを所持していれば必ず含める
- メンバーは必ず6人（マリセア含む）
- ${targetJob}の育成に必要な得意訓練を優先して固める（3人固め or 2:2）
- 必ず【ジョブ×属性別 取得可能スキル対応表】を参照し、【${targetJob}×${targetAttr}属性】の必殺技を教えられるキャラを1人・ASを教えられるキャラを1人、必ず編成に含めること
- 対応するキャラが所持キャラにいない場合のみ、その旨をreasonに記載しwantedCharactersに挙げること
- 残り4枠はサポートスキル担当
- wantedCharactersは所持していないキャラの中で【${targetJob}×${targetAttr}属性】育成に有効なキャラを最大3体
- nextToLevelは所持キャラから【${targetJob}×${targetAttr}属性】育成優先順に最大3体
` : `
あなたはパワプロアドベンチャーズ（パワアド）の最高の攻略アドバイザーです。
以下の攻略ナレッジベースを完全に理解した上で、ユーザーの所持キャラに最適なアドバイスをJSON形式で返してください。

===== 攻略ナレッジベース =====
${KNOWLEDGE}
================================

===== ユーザーの所持キャラ =====
${ownedCharacters.join('、')}
================================

以下のJSON形式のみで回答してください。前置き・後書き・マークダウン記号は一切不要です。

{
  "recommendedParties": [
    {
      "title": "【ジョブ×属性】（例：【剣士×火属性】）",
      "members": ["キャラ名1", "キャラ名2", "キャラ名3", "キャラ名4", "キャラ名5", "キャラ名6"],
      "trainingCombo": "得意訓練の組み合わせ説明（例：持久力2人＋筋力2人でスペシャルタッグ狙い）",
      "reason": "得意訓練のシナジーとスペシャルタッグ効率を中心に150字程度で説明。スキル名は一切記載しないこと"
    }
  ],
  "wantedCharacters": [
    { "name": "キャラ名", "reason": "欲しい理由：得意訓練・スキル・属性の観点から所持パーティのどこを補強できるか具体的に100字程度で説明" }
  ],
  "nextToLevel": [
    { "name": "キャラ名", "reason": "育成優先理由：このキャラを育てることでどのジョブ×属性のパーティが強化され、どの得意訓練のタッグが成立するか具体的に100字程度で説明" }
  ]
}

厳守事項：
- recommendedPartiesは剣士・弓使い・魔法使い・魔闘士から所持キャラで作れる最大3パーティ
- titleは必ず「【ジョブ名×属性名】」の形式（例：【剣士×火属性】【弓使い×水属性】）
- titleの属性名は「火属性」「水属性」「風属性」のいずれか1つのみ。「混合」「複数」は絶対に使用しない
- 属性が完全に統一できない場合は、編成内で最も人数が多い属性をタイトルに使う
- 属性の統一より「得意訓練の組み合わせ（2:2や3人固め）」を優先して構わない
- 各パーティはマリセアを所持していれば必ず含める
- メンバーは必ず6人（マリセア含む）
- 得意訓練は必ず3人固める or 2:2で固める
- 冒険者が習得できる必殺技は1つ・アクションスキルは1つのみ
- 必殺技を教えるキャラは必ず1人だけ（2人以上は無駄になる）
- アクションスキルを教えるキャラは必ず1人だけ（2人以上は無駄になる）
- マリセア含む残り4枠は全員サポートスキル（パッシブ）を提供するキャラで埋める
- wantedCharactersは所持していないキャラから最大3体
- nextToLevelは所持キャラから育成優先順に最大3体
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
