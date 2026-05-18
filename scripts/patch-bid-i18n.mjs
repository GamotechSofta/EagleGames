import fs from 'fs';
import path from 'path';

const bidsDir = path.join('frontend', 'src', 'pages', 'GameBid', 'bids');
const skip = new Set(['BidReviewModal.jsx', 'EasyModeBid.jsx', 'JodiBid.jsx', 'SinglePanaBid.jsx', 'DoublePanaBid.jsx']);

const textReplacements = [
    ['showWarning(\'Please enter points.\')', 'showWarning(bid.pleaseEnterPoints)'],
    ['showWarning("Please enter points.")', 'showWarning(bid.pleaseEnterPoints)'],
    ['showWarning(\'Please enter digit (0-9).\')', 'showWarning(bid.pleaseEnterDigit09)'],
    ['showWarning(\'Invalid digit. Use 0-9.\')', 'showWarning(bid.invalidDigit09)'],
    ['showWarning(\'Please enter points for at least one digit (0-9).\')', 'showWarning(bid.atLeastOneDigit09)'],
    ['showWarning(\'Please enter points for at least one Single Panna.\')', 'showWarning(bid.atLeastOneSinglePanna)'],
    ['showWarning(\'Please enter points for at least one Double Pana.\')', 'showWarning(bid.atLeastOneDoublePana)'],
    ['showWarning(\'Please enter points for at least one Jodi.\')', 'showWarning(bid.atLeastOneJodi)'],
    ['showWarning(\'Please enter triple pana (000-999).\')', 'showWarning(bid.pleaseEnterTriplePana)'],
    ['showWarning(\'Please enter points for at least one triple pana (000-999).\')', 'showWarning(bid.pleaseEnterTriplePanaList)'],
    ['showWarning(\'Please enter a valid triple pana (000–999) and points.\')', 'showWarning(bid.pleaseEnterTriplePanaValid)'],
    ['showWarning(\'Please enter a valid Open Ank (0-9).\')', 'showWarning(bid.pleaseEnterOpenAnk)'],
    ['showWarning(\'Please enter a valid Close Ank (0-9).\')', 'showWarning(bid.pleaseEnterCloseAnk)'],
    ['submitLabel="Submit Bet"', 'submitLabel={bid.submitBet}'],
    ['>Submit Bet<', '>{bid.submitBet}<'],
    ['>SPECIAL MODE<', '>{bid.specialMode}<'],
    ['>EASY MODE<', '>{bid.easyMode}<'],
    ['>Enter Points</label>', '>{bid.enterPoints}</label>'],
    ['>Enter Points:</label>', '>{bid.enterPointsColon}</label>'],
    ['>Quick Points</label>', '>{bid.quickPoints}</label>'],
    ['>Quick Points:</label>', '>{bid.quickPointsColon}</label>'],
    ['>Clear</button>', '>{bid.clear}</button>'],
    ['>Clear</motion.button>', '>{bid.clear}</button>'],
    ['title="Clear this group"', 'title={bid.clearGroup}'],
    ['>Select Sum</h3>', '>{bid.selectSum}</h3>'],
    ['<span className="hidden md:inline">Enter Points</span>', '<span className="hidden md:inline">{bid.jodiBulkEnterPoints}</span>'],
    ['Submit Bet {bidsCount', 'bid.submitBet} {bidsCount'],
    ['Submit Bet {', '{bid.submitBet} {'],
];

function patchContent(content, filename) {
    if (skip.has(filename)) return content;
    if (!content.includes('BidLayout') && !content.includes('BidReviewModal')) return content;

    let next = content;
    if (!next.includes('useBidI18n')) {
        const importHook = "import { useBidI18n } from '../useBidI18n';\n";
        const m = next.match(/^import .+;\n/gm);
        if (m) {
            const lastImport = m[m.length - 1];
            const idx = next.indexOf(lastImport) + lastImport.length;
            next = next.slice(0, idx) + importHook + next.slice(idx);
        }
    }

    if (!next.includes('const bid = useBidI18n()')) {
        next = next.replace(
            /^(const \w+ = \(\{[^)]*\}\) => \{\n)/m,
            '$1    const bid = useBidI18n();\n'
        );
        next = next.replace(
            /^(function \w+\(\{[^)]*\}\) \{\n)/m,
            '$1    const bid = useBidI18n();\n'
        );
    }

    for (const [from, to] of textReplacements) {
        next = next.split(from).join(to);
    }

    return next;
}

const files = fs.readdirSync(bidsDir).filter((f) => f.endsWith('.jsx'));
let changed = 0;
for (const f of files) {
    const fp = path.join(bidsDir, f);
    const orig = fs.readFileSync(fp, 'utf8');
    const patched = patchContent(orig, f);
    if (patched !== orig) {
        fs.writeFileSync(fp, patched);
        changed++;
        console.log('patched', f);
    }
}
console.log('done', changed, 'files');
