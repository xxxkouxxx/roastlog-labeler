const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_ROOT = 'G:\\マイドライブ\\KaffelogicProfiles';
const DEFAULT_OUTPUT = path.join(process.cwd(), 'beans_import.json');

const COUNTRY_OPTIONS = [
  { name: 'ETHIOPIA', aliases: ['ETHIOPIA', 'エチオピア', 'YIRGACHEFFE', 'イルガチェフェ', 'SIDAMO', 'シダモ'] },
  { name: 'GUATEMALA', aliases: ['GUATEMALA', 'グアテマラ', 'ANTIGUA', 'アンティグア'] },
  { name: 'BRAZIL', aliases: ['BRAZIL', 'ブラジル'] },
  { name: 'COLOMBIA', aliases: ['COLOMBIA', 'COLUMBIA', 'コロンビア'] },
  { name: 'KENYA', aliases: ['KENYA', 'ケニア'] },
  { name: 'TANZANIA', aliases: ['TANZANIA', 'タンザニア', 'KILIMANJARO', 'キリマンジャロ'] },
  { name: 'INDIA', aliases: ['INDIA', 'インド', 'MONSOONED MALABAR', 'MALABAR', 'モンスーン', 'マラバール'] },
  { name: 'INDONESIA', aliases: ['INDONESIA', 'インドネシア', 'マンデリン', 'MANDHELING', 'SUMATRA'] },
  { name: 'COSTA RICA', aliases: ['COSTA RICA', 'コスタリカ'] },
  { name: 'EL SALVADOR', aliases: ['EL SALVADOR', 'エルサルバドル'] },
  { name: 'HONDURAS', aliases: ['HONDURAS', 'ホンジュラス'] },
  { name: 'NICARAGUA', aliases: ['NICARAGUA', 'ニカラグア'] },
  { name: 'PANAMA', aliases: ['PANAMA', 'パナマ'] },
  { name: 'MEXICO', aliases: ['MEXICO', 'メキシコ'] },
  { name: 'PERU', aliases: ['PERU', 'ペルー'] },
  { name: 'BOLIVIA', aliases: ['BOLIVIA', 'ボリビア'] },
  { name: 'RWANDA', aliases: ['RWANDA', 'ルワンダ'] },
  { name: 'BURUNDI', aliases: ['BURUNDI', 'ブルンジ'] },
  { name: 'YEMEN', aliases: ['YEMEN', 'イエメン'] },
  { name: 'JAMAICA', aliases: ['JAMAICA', 'ジャマイカ', 'BLUE MOUNTAIN', 'ブルーマウンテン'] }
];

function stripTags(html) {
  return decodeHtml(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function firstMatch(html, pattern) {
  const match = html.match(pattern);
  return match ? stripTags(match[1]) : '';
}

function extractMetricMap(html) {
  const metrics = {};
  const pairPattern = /<div[^>]*class=["'][^"']*label[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class=["'][^"']*value[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let pairMatch;
  while ((pairMatch = pairPattern.exec(html))) {
    const label = stripTags(pairMatch[1]);
    const value = stripTags(pairMatch[2]);
    if (label && value) metrics[label] = value;
  }
  return metrics;
}

function extractParagraphs(html) {
  const paragraphs = [];
  const pattern = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const text = stripTags(match[1]);
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

function extractHref(html) {
  const match = html.match(/<a\b[^>]*href=["']([^"']+)["']/i);
  return match ? decodeHtml(match[1]).trim() : '';
}

function normalizeForCountry(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/[・ー_\-/.,()（）]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCountries(...parts) {
  const normalized = normalizeForCountry(parts.filter(Boolean).join(' '));
  return COUNTRY_OPTIONS
    .map(option => {
      const indexes = option.aliases
        .map(alias => normalized.indexOf(alias.toUpperCase()))
        .filter(index => index >= 0);
      return indexes.length ? { name: option.name, index: Math.min(...indexes) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index)
    .map(country => country.name)
    .slice(0, 3);
}

function processCode(value) {
  const text = String(value || '').toLowerCase();
  if (/(anaerobic|アナエロ|嫌気)/i.test(text)) return 'A';
  if (/(honey|ハニー|ﾊﾆｰ)/i.test(text)) return 'H';
  if (/(natural|ナチュラル|ﾅﾁｭﾗﾙ)/i.test(text)) return 'N';
  if (/(washed|ウォッシュ|ウォッシュド|ウォッシュト|水洗|fully washed)/i.test(text)) return 'W';
  return '';
}

function roastLevel(value) {
  const text = String(value || '');
  if (/中深|やや深|medium\s*dark/i.test(text)) return 'やや深煎り';
  if (/深煎り|dark|french|italian/i.test(text)) return '深煎り';
  if (/浅煎り|light/i.test(text)) return '浅煎り';
  if (/やや浅|medium\s*light/i.test(text)) return 'やや浅煎り';
  if (/中煎り|medium/i.test(text)) return '中煎り';
  return 'やや深煎り';
}

function tasteScore(flavor, kind) {
  const text = String(flavor || '');
  const hits = {
    sour: /酸味|シトラス|柑橘|レモン|オレンジ|ベリー|apple|citrus|berry/i,
    bitter: /チョコ|カカオ|ビター|ナッツ|苦|cacao|chocolate|nuts/i,
    sweet: /甘|蜜|キャラメル|ミルク|ミルキー|honey|caramel|sweet/i,
    body: /コク|重厚|ボディ|クリーミー|ミルキー|body|creamy/i,
    aroma: /香|アロマ|華やか|フローラル|floral|aroma/i
  };
  return hits[kind].test(text) ? 4 : 3;
}

function stableSlug(value) {
  const ascii = String(value || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  if (ascii) return ascii.slice(0, 60);
  return crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, 12);
}

function collectBeanInfoFiles(root) {
  const files = [];
  function walk(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase() === 'bean_info.html' && path.basename(path.dirname(fullPath)).toLowerCase() === 'docs') {
        files.push(fullPath);
      }
    }
  }
  walk(root);
  return files.sort((a, b) => a.localeCompare(b, 'ja'));
}

function beanFromHtml(filePath, usedIds) {
  const html = fs.readFileSync(filePath, 'utf8');
  const name = firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || path.basename(path.dirname(path.dirname(filePath)));
  const metaHtml = (html.match(/<div[^>]*class=["'][^"']*meta[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || '';
  const meta = stripTags(metaHtml);
  const sourceUrl = extractHref(metaHtml);
  const metrics = extractMetricMap(html);
  const paragraphs = extractParagraphs(html);
  const folderName = path.basename(path.dirname(path.dirname(filePath)));
  const countries = inferCountries(name, metrics['生産地'], folderName);
  const flavor = metrics['フレーバーノート'] || '';
  const noteLines = [
    meta ? `購入先/情報源: ${meta}` : '',
    sourceUrl ? `URL: ${sourceUrl}` : '',
    metrics['推奨焙煎度'] ? `推奨焙煎度: ${metrics['推奨焙煎度']}` : '',
    metrics['標高'] ? `標高: ${metrics['標高']}` : '',
    metrics['生産地'] ? `生産地: ${metrics['生産地']}` : '',
    metrics['品種'] ? `品種: ${metrics['品種']}` : '',
    metrics['精製'] ? `精製: ${metrics['精製']}` : '',
    flavor ? `フレーバーノート: ${flavor}` : '',
    ...paragraphs
  ].filter(Boolean);

  const baseId = `template-${stableSlug(folderName || name)}`;
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);

  return {
    id,
    name,
    origin: countries.join(' / '),
    countries,
    roast: roastLevel(metrics['推奨焙煎度']),
    process: processCode(metrics['精製']),
    roastDate: '',
    grind: '豆のまま',
    weight: '250g',
    sour: tasteScore(flavor, 'sour'),
    bitter: tasteScore(flavor, 'bitter'),
    sweet: tasteScore(flavor, 'sweet'),
    body: tasteScore(flavor, 'body'),
    aroma: tasteScore(flavor, 'aroma'),
    notes: noteLines.join('\n')
  };
}

function main() {
  const root = process.argv[2] || DEFAULT_ROOT;
  const output = process.argv[3] || DEFAULT_OUTPUT;
  const files = collectBeanInfoFiles(root);
  const usedIds = new Set();
  const beans = files.map(filePath => beanFromHtml(filePath, usedIds));
  fs.writeFileSync(output, `${JSON.stringify(beans, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${beans.length} beans to ${output}`);
}

main();
