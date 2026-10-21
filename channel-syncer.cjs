const https = require('https');
const fs = require('fs');
const path = require('path');

const INVENTORY_FILE = path.join(__dirname, 'data', 'multi-channel-inventory.json');
const TARGET_CHANNELS = [
  'NickREAKH',
  'malaynopsale',
  'malaynoprental',
  'RealEstateInformationSharing',
  'penghuothproperty'
];
const MAX_AGE_DAYS = 90;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseListingFromChunk(channel, chunk, now) {
  const timeMatch = chunk.match(/<time datetime="([^"]+)"/);
  if (!timeMatch) return null;

  const dtStr = timeMatch[1];
  const dt = new Date(dtStr);
  const ageMs = now.getTime() - dt.getTime();
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

  if (ageDays > MAX_AGE_DAYS) return null;

  const linkMatch = chunk.match(new RegExp(`href="(https://t\\.me/${channel}/\\d+)"`, 'i'));
  const link = linkMatch ? linkMatch[1] : `https://t.me/${channel}`;
  const postId = link.split('/').pop() || String(Date.now());

  const textMatch = chunk.match(/class="tgme_widget_message_text js-message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  if (!textMatch) return null;

  let clean = textMatch[1]
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#036;/g, '$')
    .replace(/&amp;/g, '&')
    .trim();

  // Availability Protection: Filter out sold, rented, or reserved units
  const isUnavailable = /sold\s*out|rented|ជួលរួច|លក់រួច|under\s*offer|booked|taken|⛔️/i.test(clean);
  if (isUnavailable) {
    return null; // Skip non-available units to protect clients from dead options
  }

  // Price Extraction (handles both "$700" and "$ 700" or "$ 1,050,000")
  const priceMatch = clean.match(/\$\s*([0-9,]+)/);
  const priceVal = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : null;

  // Determine Type: Sale vs Rent
  let type = 'Sale';
  if (channel.toLowerCase().includes('rental') || clean.toLowerCase().includes('/month') || clean.toLowerCase().includes('for rent') || clean.toLowerCase().includes('forrent') || clean.includes('ជួល')) {
    type = 'Rent';
  } else if (clean.toLowerCase().includes('forsale') || clean.toLowerCase().includes('for sale') || clean.includes('លក់')) {
    type = 'Sale';
  }

  // Location Normalization
  let location = 'Phnom Penh';
  if (/tonle\s*bassac|bassac/i.test(clean)) location = 'Tonle Bassac';
  else if (/bkk1|bkk\s*1|boeung\s*keng\s*kang\s*1/i.test(clean)) location = 'BKK1';
  else if (/toul\s*kork|boeng\s*kak/i.test(clean)) location = 'Toul Kork';
  else if (/chamkar\s*mon|toul\s*tompoung|russian\s*market|boeung\s*tumpun/i.test(clean)) location = 'Chamkarmon';
  else if (/peng\s*huoth|beoung\s*snor|boeung\s*snor|chbar\s*ampov|national\s*road\s*1/i.test(clean)) location = 'Peng Huoth (Chbar Ampov)';
  else if (/sen\s*sok/i.test(clean)) location = 'Sen Sok';
  else if (/chroy\s*changvar/i.test(clean)) location = 'Chroy Changvar';

  // Bedrooms Extraction
  let beds = '1BR';
  if (/studio/i.test(clean)) beds = 'Studio';
  else if (/6\s*🛏|\b6\s*br\b|\b6\s*bedroom\b/i.test(clean)) beds = '6BR';
  else if (/5\s*🛏|\b5\s*br\b|\b5\s*bedroom\b/i.test(clean)) beds = '5BR';
  else if (/4\s*🛏|\b4\s*br\b|\b4\s*bedroom\b/i.test(clean)) beds = '4BR';
  else if (/3\s*🛏|\b3\s*br\b|\b3\s*bedroom\b/i.test(clean)) beds = '3BR';
  else if (/2\s*🛏|\b2\s*br\b|\b2\s*bedroom\b/i.test(clean)) beds = '2BR';
  else if (/1\s*🛏|\b1\s*br\b|\b1\s*bedroom\b/i.test(clean)) beds = '1BR';

  // Title Extraction
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  let title = lines[0] || `${location} ${beds}`;
  if (lines.length > 1 && (title.startsWith('#') || title.startsWith('ខុនដូ') || title.startsWith('អាផាតមិន') || title.includes('✨') || title.includes('💫'))) {
    const candidate = lines.find(l => !l.startsWith('#') && l.length > 5);
    if (candidate) {
      title = candidate.replace(/^[📍🏢✨🍃💫🏡\s]+/, '').trim();
    }
  }

  return {
    id: `${channel}_${postId}`,
    channel: `@${channel}`,
    type,
    title,
    price: priceVal,
    priceFormatted: priceVal ? (type === 'Rent' ? `$${priceVal.toLocaleString()}/mo` : `$${priceVal.toLocaleString()} USD`) : 'Inquire',
    location,
    beds,
    date: dtStr.split('T')[0],
    ageDays,
    timestamp: dt.getTime(),
    link,
    snippet: lines.slice(0, 4).join(' · ')
  };
}

async function syncAllChannels() {
  console.log(`📡 [Channel Syncer] Scraping channels: ${TARGET_CHANNELS.map(c => '@' + c).join(', ')}...`);
  const now = new Date();
  const allListings = [];

  for (const ch of TARGET_CHANNELS) {
    try {
      let before = null;
      let chCount = 0;
      for (let p = 0; p < 8; p++) {
        const url = `https://t.me/s/${ch}` + (before ? `?before=${before}` : '');
        const html = await fetchUrl(url);
        const chunks = html.split('class="tgme_widget_message_wrap');
        let lowestId = null;

        for (let i = 1; i < chunks.length; i++) {
          const linkM = chunks[i].match(new RegExp(`href="https://t\\.me/${ch}/(\\d+)"`));
          if (linkM) {
            const idNum = parseInt(linkM[1], 10);
            if (!lowestId || idNum < lowestId) lowestId = idNum;
          }
          const item = parseListingFromChunk(ch, chunks[i], now);
          if (item) {
            allListings.push(item);
            chCount++;
          }
        }
        if (!lowestId) break;
        before = lowestId;
      }
      console.log(`  ✓ @${ch}: Synced ${chCount} listings within last ${MAX_AGE_DAYS} days.`);
    } catch (err) {
      console.error(`  ❌ Failed to sync @${ch}:`, err.message);
    }
  }

  // Deduplicate by link/id and sort freshest first
  const seen = new Set();
  const uniqueListings = [];
  for (const item of allListings) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      uniqueListings.push(item);
    }
  }

  uniqueListings.sort((a, b) => b.timestamp - a.timestamp);

  // Merge new listings with existing ones so transient fetch failures never wipe inventory
  let existingListings = [];
  if (fs.existsSync(INVENTORY_FILE)) {
    try {
      const old = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
      if (Array.isArray(old.listings)) existingListings = old.listings;
    } catch (_) {}
  }

  const map = new Map();
  for (const item of existingListings) {
    map.set(item.id, item);
  }
  for (const item of uniqueListings) {
    map.set(item.id, item);
  }

  const combined = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);

  if (combined.length === 0) {
    console.log('⚠️ No listings scraped and no existing listings to retain. Skipping write.');
    return [];
  }

  const payload = {
    updatedAt: now.toISOString(),
    totalCount: combined.length,
    channels: TARGET_CHANNELS.map(c => '@' + c),
    listings: combined
  };

  fs.mkdirSync(path.dirname(INVENTORY_FILE), { recursive: true });
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`💾 Saved ${combined.length} multi-channel listings to ${INVENTORY_FILE}`);
  return combined;
}

function searchInventory(queryText, intent = null) {
  if (!fs.existsSync(INVENTORY_FILE)) {
    return [];
  }
  const raw = (queryText || '').trim();
  // Never treat commands as search queries
  if (raw.startsWith('/') || raw.length < 2) {
    return [];
  }

  const data = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
  const listings = data.listings || [];

  const q = raw.toLowerCase();

  // Detect type first so budget scaling is accurate
  let typeFilter = intent;
  if (/rent|lease|ជួល|\/mo|month|apartment|flat|tenant/i.test(q)) typeFilter = 'Rent';
  else if (/buy|sale|purchase|invest|លក់|resale|yield/i.test(q)) typeFilter = 'Sale';

  // Detect location in query
  let locFilter = null;
  if (/bkk1|bkk\s*1|boeung\s*keng\s*kang\s*1/i.test(q)) locFilter = 'BKK1';
  else if (/bkk2|bkk3|bkk/i.test(q)) locFilter = 'BKK1';
  else if (/tonle\s*bassac|bassac/i.test(q)) locFilter = 'Tonle Bassac';
  else if (/chamkar\s*mon|toul\s*tompoung|russian\s*market|ttp|tumpun/i.test(q)) locFilter = 'Chamkarmon';
  else if (/toul\s*kork|tk|boeng\s*kak/i.test(q)) locFilter = 'Toul Kork';

  // Detect layout in query
  let bedFilter = null;
  if (/studio/i.test(q)) bedFilter = 'Studio';
  else if (/(?:4|four)[\s-]*(?:br|bed(?:room)?s?)/i.test(q)) bedFilter = '4BR';
  else if (/(?:3|three)[\s-]*(?:br|bed(?:room)?s?)/i.test(q)) bedFilter = '3BR';
  else if (/(?:2|two)[\s-]*(?:br|bed(?:room)?s?)/i.test(q)) bedFilter = '2BR';
  else if (/(?:1|one)[\s-]*(?:br|bed(?:room)?s?)/i.test(q)) bedFilter = '1BR';

  // Detect price in query (e.g. $400, $50k, 100k, 1000)
  let maxPrice = null;
  const pMatch = q.match(/(\d+)\s*k\b/i);
  if (pMatch) {
    maxPrice = parseInt(pMatch[1], 10) * 1000;
  } else {
    const rawNum = q.match(/\$?\s*(\d{2,6})\b/);
    if (rawNum) {
      const num = parseInt(rawNum[1], 10);
      if (typeFilter === 'Rent' || q.includes('month') || q.includes('/mo') || q.includes('rent') || num <= 3000) {
        maxPrice = num;
        if (!typeFilter && num <= 3000) typeFilter = 'Rent';
      } else if (num < 500) {
        maxPrice = num * 1000;
      } else {
        maxPrice = num;
      }
    }
  }

  // Specific keywords to look for if not purely budget/location
  const stopWords = new Set(['in', 'at', 'for', 'the', 'and', 'with', 'under', 'below', 'around', 'of', 'to', 'a', 'an']);
  const tokens = q.split(/[\s,]+/).filter(t => t.length > 1 && !stopWords.has(t) && !t.match(/^\$?\d+k?$/));

  return listings.filter(item => {
    // Strict type separation: Sale only shows Sale, Rent only shows Rent
    if (typeFilter && item.type.toLowerCase() !== typeFilter.toLowerCase()) return false;
    if (locFilter && item.location.toLowerCase() !== locFilter.toLowerCase()) return false;
    if (bedFilter && item.beds.toLowerCase() !== bedFilter.toLowerCase()) return false;
    if (maxPrice && item.price && item.price > maxPrice * 1.25) return false;

    // If text tokens exist, at least one token must match
    if (tokens.length > 0) {
      const fullItemText = `${item.title} ${item.channel} ${item.location} ${item.beds} ${item.snippet}`.toLowerCase();
      const hasToken = tokens.some(t => fullItemText.includes(t));
      if (!hasToken && !locFilter && !bedFilter && !maxPrice) return false;
    }

    return true;
  }).slice(0, 5);
}

module.exports = {
  syncAllChannels,
  searchInventory,
  INVENTORY_FILE
};

if (require.main === module) {
  syncAllChannels().then(items => {
    console.log(`\nTest Search: "Tonle Bassac"`);
    console.log(searchInventory('Tonle Bassac'));
  });
}
