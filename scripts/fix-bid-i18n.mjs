import fs from 'fs';
import path from 'path';

const bidsDir = path.join('frontend', 'src', 'pages', 'GameBid', 'bids');
const skip = new Set(['BidReviewModal.jsx', 'EasyModeBid.jsx']);

const textReplacements = [
    ['>Count</div>', '>{bid.count}</div>'],
    ['>Bet Amount</div>', '>{bid.betAmount}</motion.div>'],
    ['>Clear</button>', '>{bid.clear}</button>'],
    ['>Enter Points</label>', '>{bid.enterPoints}</label>'],
    ['>Enter Points:</label>', '>{bid.enterPointsColon}</label>'],
    ['>Quick Points</label>', '>{bid.quickPoints}</label>'],
    ['>Quick Points:</label>', '>{bid.quickPointsColon}</label>'],
    ['>Select Sum</h3>', '>{bid.selectSum}</h3>'],
    ['<span className="hidden md:inline">Enter Points</span>', '<span className="hidden md:inline">{bid.jodiBulkEnterPoints}</span>'],
    ['label="Enter Jodi"', 'label={bid.enterJodi}'],
    ['>Enter Pana:</label>', '>{bid.t(\'bid_enterPana\')}:</label>'],
    ['>SPECIAL MODE<', '>{bid.specialMode}<'],
    ['>EASY MODE<', '>{bid.easyMode}<'],
    ['submitLabel="Submit Bet"', 'submitLabel={bid.submitBet}'],
    ['showWarning(\'Enter at least 3 digits to generate combinations.\')', "showWarning(bid.t('bid_enterMin3Digits'))"],
    ['showWarning(\'Please enter points.\')', 'showWarning(bid.pleaseEnterPoints)'],
];

function ensureBidHook(content) {
    if (!content.includes('useBidI18n')) return content;
    if (content.includes('const bid = useBidI18n()')) return content;
    const patterns = [
        /^(const \w+ = \(\{[\s\S]*?\}\) => \{\r?\n)/m,
        /^(function \w+\(\{[\s\S]*?\}\) \{\r?\n)/m,
        /^(const \w+ = \([^)]*\) => \{\r?\n)/m,
    ];
    for (const re of patterns) {
        const m = content.match(re);
        if (m) return content.replace(m[0], `${m[0]}    const bid = useBidI18n();\n`);
    }
    console.warn('  could not insert hook');
    return content;
}

function ensureImport(content) {
    if (content.includes('useBidI18n')) return content;
    if (!content.includes('BidLayout') && !content.includes('BidReviewModal') && !content.includes('EasyModeBid'))
        return content;
    const importHook = "import { useBidI18n } from '../useBidI18n';\n";
    const m = content.match(/^import .+;\r?\n/gm);
    if (!m) return content;
    const lastImport = m[m.length - 1];
    const idx = content.indexOf(lastImport) + lastImport.length;
    return content.slice(0, idx) + importHook + content.slice(idx);
}

let changed = 0;
for (const f of fs.readdirSync(bidsDir).filter((x) => x.endsWith('.jsx') && !skip.has(x))) {
    const fp = path.join(bidsDir, f);
    let content = fs.readFileSync(fp, 'utf8');
    const orig = content;
    content = ensureImport(content);
    content = ensureBidHook(content);
    for (const [from, to] of textReplacements) {
        content = content.split(from).join(to);
    }
    // fix mistaken Bet Amount closing tag
    content = content.replace(/\{bid\.betAmount\}<\/motion\.div>/g, '{bid.betAmount}</div>');
    if (content !== orig) {
        fs.writeFileSync(fp, content);
        changed++;
        console.log('fixed', f);
    }
}
console.log('done', changed, 'files');
