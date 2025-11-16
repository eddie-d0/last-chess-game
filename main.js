"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = void 0;
const obsidian_1 = require("obsidian");
exports.DEFAULT_SETTINGS = {
    username: 'gothamchess',
    templateDefault: '- {{end_date}} - [{{focus_result}} a {{game_type}} game]({{url}}) against [{{foe}}]({{foe_url}})<sup>{{foe_rating}}</sup>  rating is now {{rating_change}}/{{focus_rating}}',
    templateOtherUser: '- {{end_date}} - [{{white}}]({{white_url}})({{white_result}}) vs [{{black}}]({{black_url}})({{black_result}}) in {{moves}} moves',
    dateFormat: 'yyyy-MM-dd',
    timeFormat: 'hh:mm',
    lastLookupUsername: '',
};
class LastChessSettingTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Last Chess.com Game Settings' });
        // Default user
        new obsidian_1.Setting(containerEl)
            .setName('Default Chess.com Username')
            .setDesc('Used when inserting the last game for the default user.')
            .addText((text) => text
            .setPlaceholder('e.g. magnuscarlsen')
            .setValue(this.plugin.settings.username)
            .onChange(async (value) => {
            this.plugin.settings.username = value.trim();
            await this.plugin.saveSettings();
            this.plugin.updateCommandNames();
        }));
        // Date format
        const previewEl = containerEl.createEl('div', { attr: { style: 'margin: 6px 0; color: var(--text-muted);' } });
        const updatePreview = () => {
            const now = new Date();
            const dateP = formatWithPattern(now, this.plugin.settings.dateFormat || 'yyyy-MM-dd');
            const timeP = formatWithPattern(now, this.plugin.settings.timeFormat || 'hh:mm');
            previewEl.textContent = `Preview: ${dateP} ${timeP}`;
        };
        new obsidian_1.Setting(containerEl)
            .setName('Date format')
            .setDesc('Use tokens: yyyy, MM, dd. Example: yyyy-MM-dd')
            .addText((text) => text
            .setPlaceholder('yyyy-MM-dd')
            .setValue(this.plugin.settings.dateFormat)
            .onChange(async (value) => {
            this.plugin.settings.dateFormat = value || 'yyyy-MM-dd';
            await this.plugin.saveSettings();
            updatePreview();
        }));
        new obsidian_1.Setting(containerEl)
            .setName('Time format')
            .setDesc('Use tokens: HH, hh, mm, ss, a. Example: hh:mm')
            .addText((text) => text
            .setPlaceholder('hh:mm')
            .setValue(this.plugin.settings.timeFormat)
            .onChange(async (value) => {
            this.plugin.settings.timeFormat = value || 'hh:mm';
            await this.plugin.saveSettings();
            updatePreview();
        }));
        updatePreview();
        // Template for default user
        new obsidian_1.Setting(containerEl)
            .setName('Template (Default user)')
            .setDesc('See the GitHub repository for available handlebars.')
            .addTextArea((text) => {
            text
                .setPlaceholder('Template when inserting for the default user')
                .setValue(this.plugin.settings.templateDefault)
                .onChange(async (value) => {
                this.plugin.settings.templateDefault = value;
                await this.plugin.saveSettings();
            });
            text.inputEl.rows = 4;
            text.inputEl.cols = 50;
        });
        // Template for other (looked-up) user
        new obsidian_1.Setting(containerEl)
            .setName('Template (Lookup another user)')
            .setDesc('See the GitHub repository for available handlebars.')
            .addTextArea((text) => {
            text
                .setPlaceholder('Template when inserting for a looked-up user')
                .setValue(this.plugin.settings.templateOtherUser)
                .onChange(async (value) => {
                this.plugin.settings.templateOtherUser = value;
                await this.plugin.saveSettings();
            });
            text.inputEl.rows = 4;
            text.inputEl.cols = 50;
        });
        // Link to GitHub repo for handlebars reference
        const linkWrap = containerEl.createDiv({ attr: { style: 'margin-top: 12px; color: var(--text-muted);' } });
        const linkP = linkWrap.createEl('p');
        linkP.appendText('For a full list of template handlebars, see ');
        linkP.createEl('a', { href: 'https://github.com/eddie-d0/last-chess.com-game', text: 'the GitHub repository' });
        linkP.appendText('.');
    }
}
class LookupUserModal extends obsidian_1.Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.titleEl.setText('Lookup Chess.com user');
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        const desc = contentEl.createEl('div', { text: 'Enter a Chess.com username and choose game type.' });
        desc.setAttr('style', 'margin-bottom:8px;');
        const userDiv = contentEl.createDiv({ cls: 'lastchess-lookup-user' });
        userDiv.createEl('label', { text: 'Username', attr: { style: 'display:block; font-weight:600; margin-bottom:4px;' } });
        // Row with input and link on the right
        const row = userDiv.createDiv({ attr: { style: 'display:flex; align-items:center; gap:8px;' } });
        this.inputEl = row.createEl('input', { type: 'text' });
        this.inputEl.placeholder = 'e.g. magnuscarlsen';
        this.inputEl.value = this.plugin.settings.lastLookupUsername || '';
        this.inputEl.setAttr('style', 'flex:1; width:100%; box-sizing:border-box;');
        this.randomLinkEl = row.createEl('a', { text: 'Random Titled Player', href: '#' });
        this.randomLinkEl.setAttr('style', 'font-size:0.8rem; margin-left:auto;');
        this.randomLinkEl.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                this.randomLinkEl.textContent = 'Picking…';
                this.randomLinkEl.addClass('is-loading');
                const username = await pickRandomTitledUser();
                if (username) {
                    this.inputEl.value = username;
                    this.inputEl.focus();
                }
                else {
                    new obsidian_1.Notice('Could not pick a random titled player.');
                }
            }
            catch (err) {
                console.error('[LastChess] random titled user failed', err);
                new obsidian_1.Notice('Failed to fetch leaderboards.');
            }
            finally {
                this.randomLinkEl.textContent = 'Random Titled Player';
                this.randomLinkEl.removeClass('is-loading');
            }
        });
        const typeDiv = contentEl.createDiv({ cls: 'lastchess-lookup-type', attr: { style: 'margin-top:10px;' } });
        typeDiv.createEl('label', { text: 'Game type', attr: { style: 'display:block; font-weight:600; margin-bottom:4px;' } });
        this.selectEl = typeDiv.createEl('select');
        const options = [
            { value: 'any', label: 'Any' },
            { value: 'daily', label: 'Daily' },
            { value: 'blitz', label: 'Blitz' },
            { value: 'rapid', label: 'Rapid' },
            { value: 'bullet', label: 'Bullet' },
        ];
        for (const opt of options) {
            const o = this.selectEl.createEl('option', { text: opt.label });
            o.value = opt.value;
        }
        const btnBar = contentEl.createDiv({ attr: { style: 'display:flex; gap:8px; margin-top:14px; justify-content:flex-end;' } });
        const cancelBtn = btnBar.createEl('button', { text: 'Cancel' });
        const okBtn = btnBar.createEl('button', { text: 'Insert' });
        okBtn.addClass('mod-cta');
        cancelBtn.addEventListener('click', () => this.close());
        okBtn.addEventListener('click', () => this.submit());
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter')
                this.submit();
        });
        // Focus username
        window.setTimeout(() => this.inputEl.focus(), 0);
    }
    async submit() {
        const username = (this.inputEl.value || '').trim();
        if (!username) {
            new obsidian_1.Notice('Please enter a Chess.com username.');
            return;
        }
        this.plugin.settings.lastLookupUsername = username;
        await this.plugin.saveSettings();
        const choice = this.selectEl.value;
        if (choice === 'any') {
            await this.plugin.fetchInsert(username, this.plugin.settings.templateOtherUser, { lookupUsername: username });
        }
        else {
            const tc = choice;
            await this.plugin.fetchInsert(username, this.plugin.settings.templateOtherUser, { lookupUsername: username }, { timeClass: tc });
        }
        this.close();
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
function normalizeUsername(name) {
    return name?.trim().toLowerCase();
}
// Categorize a player's result from Chess.com into win/loss/draw
function outcomeCategory(result) {
    const r = (result || '').toLowerCase();
    if (r === 'win')
        return 'win';
    if (r === 'stalemate' || r === 'agreed' || r === 'repetition' || r === 'insufficient' || r === '50move' || r === 'timevsinsufficient' || r === 'draw')
        return 'draw';
    if (r === 'checkmated' || r === 'resigned' || r === 'timeout' || r === 'abandoned' || r === 'lose')
        return 'loss';
    return 'unknown';
}
function pastTenseLabel(cat) {
    if (cat === 'win')
        return 'Won';
    if (cat === 'loss')
        return 'Lost';
    if (cat === 'draw')
        return 'Drew';
    return '';
}
function zeroPad(n, len = 2) { return String(n).padStart(len, '0'); }
function formatWithPattern(date, pattern) {
    const y = date.getFullYear();
    const M = date.getMonth() + 1;
    const d = date.getDate();
    const H = date.getHours();
    const m = date.getMinutes();
    const s = date.getSeconds();
    const h12 = H % 12 === 0 ? 12 : H % 12;
    const ampm = H < 12 ? 'AM' : 'PM';
    const tokenRe = /(yyyy|MM|dd|HH|hh|mm|ss|a)/g;
    const map = {
        yyyy: String(y),
        MM: zeroPad(M),
        dd: zeroPad(d),
        HH: zeroPad(H),
        hh: zeroPad(h12),
        mm: zeroPad(m),
        ss: zeroPad(s),
        a: ampm,
    };
    const fmt = pattern || 'yyyy-MM-dd HH:mm';
    return fmt.replace(tokenRe, (tok) => map[tok] ?? tok);
}
function formatDate(ts, pattern) {
    if (!ts)
        return '';
    try {
        const d = new Date(ts * 1000);
        return formatWithPattern(d, pattern || 'yyyy-MM-dd');
    }
    catch {
        return '';
    }
}
function formatDateOnly(ts, datePattern) {
    return formatDate(ts, datePattern || 'yyyy-MM-dd');
}
function formatTimeOnly(ts, timePattern) {
    if (!ts)
        return '';
    try {
        const d = new Date(ts * 1000);
        const pat = timePattern || 'hh:mm';
        return formatWithPattern(d, pat);
    }
    catch {
        return '';
    }
}
function formatTimestamp(ts, datePattern, timePattern) {
    const d = formatDateOnly(ts, datePattern);
    const t = formatTimeOnly(ts, timePattern);
    if (d && t)
        return `${d} ${t}`;
    return d || t || '';
}
function formatDuration(start, end, timeClass) {
    if (!start || !end || end < start)
        return '';
    const ms = (end - start) * 1000;
    if ((timeClass || '').toLowerCase() === 'daily') {
        const days = Math.max(0, Math.round(ms / (24 * 3600 * 1000)));
        return days === 1 ? '1 day' : `${days} days`;
    }
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${zeroPad(hours)}:${zeroPad(minutes)}`; // clock-like HH:MM
}
function countFullMovesFromPgn(pgn) {
    if (!pgn)
        return 'N/A';
    try {
        // Separate headers and moves
        const parts = pgn.split(/\n\n/);
        const movesSection = parts[parts.length - 1] || '';
        // Remove comments { ... } and variations ( ... )
        let s = movesSection.replace(/\{[^}]*\}/g, ' ').replace(/\([^)]*\)/g, ' ');
        // Remove result tokens
        s = s.replace(/\s(1-0|0-1|1\/2-1\/2|\*)\s*$/m, ' ');
        // Split by whitespace
        const tokens = s.trim().split(/\s+/);
        // Filter out move numbers like "12." or "12..."
        const sans = tokens.filter(t => !/^\d+\.\.\.|^\d+\.$/.test(t));
        // Exclude empty and NAGs like $5 and annotations +, #, !?
        const clean = sans.filter(t => t && !/^\$\d+$/.test(t) && !/^\d-\d$/.test(t) && !/^\*$/.test(t) && !/^(1-0|0-1|1\/2-1\/2)$/.test(t) && !/^[!?+#]+$/.test(t));
        const ply = clean.length;
        const fullMoves = Math.max(1, Math.ceil(ply / 2));
        return String(fullMoves);
    }
    catch {
        return 'N/A';
    }
}
async function fetchJson(url) {
    const res = await (0, obsidian_1.requestUrl)({ url, method: 'GET' });
    if (res.status !== 200) {
        throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return res.json;
}
// Pick a random titled player from Chess.com leaderboards
async function pickRandomTitledUser() {
    try {
        const data = await fetchJson('https://api.chess.com/pub/leaderboards');
        const buckets = [];
        for (const key of Object.keys(data || {})) {
            const arr = data[key];
            if (Array.isArray(arr))
                buckets.push(arr);
        }
        const usernames = [];
        for (const arr of buckets) {
            for (const item of arr) {
                const u = (item && (item.username || item.player || item.url || ''));
                const title = (item && (item.title || item.tier || item.titled));
                // Prefer entries that explicitly carry a title field; otherwise include all usernames
                if (u) {
                    // If it's a URL like https://www.chess.com/member/xxx extract username
                    const m = typeof u === 'string' ? u.match(/\/member\/([^\/?#]+)/i) : null;
                    const username = m ? decodeURIComponent(m[1]) : u;
                    if (item && typeof item.title === 'string' && item.title.length > 0) {
                        usernames.push(username);
                    }
                }
            }
        }
        // Fallback: if we found no titled-specific entries, try any usernames present
        if (usernames.length === 0) {
            for (const arr of buckets) {
                for (const item of arr) {
                    const u = (item && (item.username || item.player || item.url || ''));
                    if (u) {
                        const m = typeof u === 'string' ? u.match(/\/member\/([^\/?#]+)/i) : null;
                        const username = m ? decodeURIComponent(m[1]) : u;
                        usernames.push(username);
                    }
                }
            }
        }
        if (usernames.length === 0)
            return null;
        const pick = usernames[Math.floor(Math.random() * usernames.length)];
        return pick;
    }
    catch {
        return null;
    }
}
async function getLastGameForUser(username, opts) {
    const u = normalizeUsername(username);
    if (!u)
        return null;
    const indexUrl = `https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`;
    const idx = await fetchJson(indexUrl);
    const archives = idx.archives || [];
    if (archives.length === 0)
        return null;
    // Iterate from latest archive backwards until we find a matching game
    for (let i = archives.length - 1; i >= 0; i--) {
        const month = await fetchJson(archives[i]);
        const games = month.games || [];
        if (games.length === 0)
            continue;
        // Choose candidate set: if filtering by time class, prefilter
        const candidates = opts?.timeClass
            ? games.filter((g) => g.time_class?.toLowerCase() === opts.timeClass)
            : games;
        if (candidates.length === 0)
            continue;
        // Pick most recent by end_time
        let latest = candidates[candidates.length - 1];
        for (const g of candidates) {
            if (!latest?.end_time || (g.end_time && g.end_time > latest.end_time)) {
                latest = g;
            }
        }
        if (!latest)
            continue;
        const wu = normalizeUsername(latest.white?.username);
        const bu = normalizeUsername(latest.black?.username);
        let meColor = null;
        if (wu === u)
            meColor = 'white';
        else if (bu === u)
            meColor = 'black';
        if (!meColor)
            continue;
        return { game: latest, meColor, meUsername: username };
    }
    return null;
}
// Find the previous game (same time class) that ended before a given end_time
async function getPreviousGameForUser(username, timeClass, beforeEndTime) {
    const u = normalizeUsername(username);
    if (!u)
        return null;
    const indexUrl = `https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`;
    const idx = await fetchJson(indexUrl);
    const archives = idx.archives || [];
    if (archives.length === 0)
        return null;
    // iterate from latest to oldest
    for (let i = archives.length - 1; i >= 0; i--) {
        const month = await fetchJson(archives[i]);
        const games = month.games || [];
        const candidates = games.filter((g) => (g.time_class?.toLowerCase() === timeClass) && (g.end_time || 0) < beforeEndTime);
        if (candidates.length === 0)
            continue;
        // pick latest before cutoff
        let latest = undefined;
        for (const g of candidates) {
            if (!latest || ((g.end_time || 0) > (latest.end_time || 0))) {
                latest = g;
            }
        }
        if (latest)
            return latest;
    }
    return null;
}
function profileUrl(username) {
    const u = (username || '').trim();
    if (!u)
        return '';
    return `https://www.chess.com/member/${encodeURIComponent(u)}`;
}
function labelGameType(tc) {
    const t = (tc || '').toLowerCase();
    if (t === 'bullet')
        return 'Bullet';
    if (t === 'blitz')
        return 'Blitz';
    if (t === 'rapid')
        return 'Rapid';
    if (t === 'daily')
        return 'Daily';
    return '';
}
async function buildTemplateVars(game, meColor, lookupUsername, dateFormat, timeFormat) {
    const white = game.white || {};
    const black = game.black || {};
    const timeClass = game.time_class || '';
    const start = game.start_time;
    const end = game.end_time;
    const whiteCat = outcomeCategory(white.result);
    const blackCat = outcomeCategory(black.result);
    const winnerSide = whiteCat === 'win' ? 'white' : blackCat === 'win' ? 'black' : null;
    const loserSide = whiteCat === 'loss' ? 'white' : blackCat === 'loss' ? 'black' : null;
    const winner = winnerSide ? (winnerSide === 'white' ? white : black) : undefined;
    const loser = loserSide ? (loserSide === 'white' ? white : black) : undefined;
    const lookupName = (lookupUsername && lookupUsername.trim()) || (meColor === 'white' ? white.username : black.username) || '';
    const lookupNorm = normalizeUsername(lookupName);
    const whiteNorm = normalizeUsername(white.username);
    const blackNorm = normalizeUsername(black.username);
    const lookupSide = lookupNorm === whiteNorm ? 'white' : lookupNorm === blackNorm ? 'black' : meColor;
    const lookupPlayer = lookupSide === 'white' ? white : black;
    const otherPlayer = lookupSide === 'white' ? black : white;
    // Compute rating change vs previous game of same type for focus user (formerly lookup)
    let ratingChange = '';
    try {
        if (end && timeClass && lookupName) {
            const prev = await getPreviousGameForUser(lookupName, timeClass, end);
            if (prev) {
                const prevWhite = prev.white || {};
                const prevBlack = prev.black || {};
                const prevLookup = normalizeUsername(prevWhite.username) === lookupNorm ? prevWhite : prevBlack;
                if (lookupPlayer.rating != null && prevLookup.rating != null) {
                    const delta = lookupPlayer.rating - prevLookup.rating;
                    ratingChange = (delta > 0 ? `+${delta}` : `${delta}`);
                }
            }
        }
    }
    catch (e) {
        // ignore, leave empty -> N/A via normalizer
    }
    const startDate = formatDateOnly(start, dateFormat);
    const endDate = formatDateOnly(end, dateFormat);
    const startTime = formatTimeOnly(start, timeFormat);
    const endTime = formatTimeOnly(end, timeFormat);
    const vars = {
        rated: game.rated ? 'Rated' : 'Unrated',
        rules: game.rules || '',
        // New timestamp fields
        start_timestamp: formatTimestamp(start, dateFormat, timeFormat),
        end_timestamp: formatTimestamp(end, dateFormat, timeFormat),
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        moves: countFullMovesFromPgn(game.pgn),
        time: formatDuration(start, end, timeClass),
        url: game.url || '',
        game_type: labelGameType(timeClass), // capitalized game type
        white: white.username || '',
        white_url: profileUrl(white.username),
        white_rating: white.rating != null ? String(white.rating) : '',
        white_result: pastTenseLabel(whiteCat),
        black: black.username || '',
        black_url: profileUrl(black.username),
        black_rating: black.rating != null ? String(black.rating) : '',
        black_result: pastTenseLabel(blackCat),
        winner: winner?.username || '',
        winner_url: winner?.username ? profileUrl(winner.username) : '',
        winner_rating: winner?.rating != null ? String(winner.rating) : '',
        loser: loser?.username || '',
        loser_url: loser?.username ? profileUrl(loser.username) : '',
        loser_rating: loser?.rating != null ? String(loser.rating) : '',
        // focus/foe (new names replacing lookup/other)
        focus: lookupPlayer.username || lookupName,
        focus_url: profileUrl(lookupPlayer.username || lookupName),
        focus_rating: lookupPlayer.rating != null ? String(lookupPlayer.rating) : '',
        focus_result: pastTenseLabel(outcomeCategory(lookupPlayer.result)),
        foe: otherPlayer.username || '',
        foe_url: profileUrl(otherPlayer.username),
        foe_rating: otherPlayer.rating != null ? String(otherPlayer.rating) : '',
        foe_result: pastTenseLabel(outcomeCategory(otherPlayer.result)),
        rating_change: ratingChange,
    };
    return vars;
}
function normalizeVarsToNA(vars) {
    const out = {};
    for (const [k, v] of Object.entries(vars)) {
        if (v === undefined || v === null)
            out[k] = 'N/A';
        else if (typeof v === 'string' && v.length === 0)
            out[k] = 'N/A';
        else
            out[k] = v;
    }
    return out;
}
function renderTemplate(tpl, vars) {
    let out = tpl || '';
    const normalized = normalizeVarsToNA(vars);
    for (const [k, v] of Object.entries(normalized)) {
        const re = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
        out = out.replace(re, v ?? 'N/A');
    }
    // Replace removed legacy/renamed handlebars with N/A so they don't leak into output
    const legacyKeys = [
        'start', 'end', 'time_class', 'timeClass',
        // removed in favor of focus/foe
        'lookup', 'lookup_url', 'lookup_rating', 'lookup_result',
        'other', 'other_url', 'other_rating', 'other_result'
    ];
    for (const key of legacyKeys) {
        const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        out = out.replace(re, 'N/A');
    }
    return out.trim();
}
class LastChessComGamePlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.statusBarEl = null;
        this.busyCount = 0;
        // Command ids we own (for dynamic renaming)
        this.cmdIds = {
            any: 'last-game-played-any',
            daily: 'last-game-played-daily',
            blitz: 'last-game-played-blitz',
            rapid: 'last-game-played-rapid',
            bullet: 'last-game-played-bullet',
            lookup: 'lookup-user-last-game',
        };
    }
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new LastChessSettingTab(this.app, this));
        // Status bar
        this.statusBarEl = this.addStatusBarItem();
        this.clearBusy();
        // Commands (Command Palette)
        this.registerCommands();
        console.log('Last Chess.com Game plugin loaded');
    }
    onunload() {
        console.log('Last Chess.com Game plugin unloaded');
    }
    beginBusy(text = 'Fetching from Chess.com…') {
        this.busyCount++;
        if (this.statusBarEl)
            this.statusBarEl.setText(text);
    }
    endBusy() {
        this.busyCount = Math.max(0, this.busyCount - 1);
        if (this.busyCount === 0)
            this.clearBusy();
    }
    clearBusy() {
        if (this.statusBarEl)
            this.statusBarEl.setText('');
    }
    async ensureDefaultUsername() {
        let u = this.settings.username?.trim();
        if (!u) {
            const input = window.prompt('Enter your Chess.com username') ?? '';
            const trimmed = input.trim();
            if (!trimmed)
                return null;
            u = trimmed;
            this.settings.username = u;
            await this.saveSettings();
            this.updateCommandNames();
        }
        return u;
    }
    nameUser() {
        return this.settings.username?.trim() || '>USER<';
    }
    nameAny() { return `Last game played by ${this.nameUser()} regardless of type`; }
    nameDaily() { return `Last Daily played by ${this.nameUser()}`; }
    nameBlitz() { return `Last Blitz played by ${this.nameUser()}`; }
    nameRapid() { return `Last Rapid played by ${this.nameUser()}`; }
    nameBullet() { return `Last Bullet played by ${this.nameUser()}`; }
    fullCommandId(shortId) {
        // In Obsidian, command ids are stored as '<plugin-id>:<shortId>'
        return `${this.manifest.id}:${shortId}`;
    }
    registerCommands() {
        // Time-class specific commands (default user) — order: Daily, Rapid, Blitz, Bullet
        this.addCommand({
            id: this.cmdIds.daily,
            name: this.nameDaily(),
            callback: async () => {
                const u = await this.ensureDefaultUsername();
                if (!u)
                    return;
                await this.fetchInsert(u, this.settings.templateDefault, { lookupUsername: '' }, { timeClass: 'daily' });
            },
        });
        this.addCommand({
            id: this.cmdIds.rapid,
            name: this.nameRapid(),
            callback: async () => {
                const u = await this.ensureDefaultUsername();
                if (!u)
                    return;
                await this.fetchInsert(u, this.settings.templateDefault, { lookupUsername: '' }, { timeClass: 'rapid' });
            },
        });
        this.addCommand({
            id: this.cmdIds.blitz,
            name: this.nameBlitz(),
            callback: async () => {
                const u = await this.ensureDefaultUsername();
                if (!u)
                    return;
                await this.fetchInsert(u, this.settings.templateDefault, { lookupUsername: '' }, { timeClass: 'blitz' });
            },
        });
        this.addCommand({
            id: this.cmdIds.bullet,
            name: this.nameBullet(),
            callback: async () => {
                const u = await this.ensureDefaultUsername();
                if (!u)
                    return;
                await this.fetchInsert(u, this.settings.templateDefault, { lookupUsername: '' }, { timeClass: 'bullet' });
            },
        });
        // Lookup command (modal)
        this.addCommand({
            id: this.cmdIds.lookup,
            name: 'Lookup user…',
            callback: async () => {
                new LookupUserModal(this.app, this).open();
            },
        });
        // Last game regardless of type (default user) — keep registered last
        this.addCommand({
            id: this.cmdIds.any,
            name: this.nameAny(),
            callback: async () => {
                const u = await this.ensureDefaultUsername();
                if (!u)
                    return;
                await this.fetchInsert(u, this.settings.templateDefault, { lookupUsername: u });
            },
        });
    }
    reRegisterCommands() {
        const commands = this.app.commands;
        try {
            // Attempt to remove existing commands so we can re-add with new names
            const ids = Object.values(this.cmdIds);
            for (const sid of ids) {
                const fullId = this.fullCommandId(sid);
                if (commands?.commands?.[fullId] && typeof commands.removeCommand === 'function') {
                    try {
                        commands.removeCommand(fullId);
                    }
                    catch { }
                }
            }
        }
        catch { }
        // Re-add with current username reflected in names
        this.registerCommands();
    }
    updateCommandNames() {
        const cmds = {
            [this.cmdIds.any]: this.nameAny(),
            [this.cmdIds.daily]: this.nameDaily(),
            [this.cmdIds.blitz]: this.nameBlitz(),
            [this.cmdIds.rapid]: this.nameRapid(),
            [this.cmdIds.bullet]: this.nameBullet(),
            [this.cmdIds.lookup]: 'Lookup user…',
        };
        const commands = this.app.commands;
        if (!commands)
            return;
        let updated = false;
        for (const [shortId, name] of Object.entries(cmds)) {
            const fullId = this.fullCommandId(shortId);
            const cmd = commands.commands?.[fullId];
            if (cmd) {
                cmd.name = name;
                if (typeof commands.updateCommand === 'function') {
                    try {
                        commands.updateCommand(cmd);
                        updated = true;
                    }
                    catch { }
                }
            }
        }
        // If we couldn't update (older API), re-register commands to refresh names
        if (!updated || typeof commands.updateCommand !== 'function') {
            this.reRegisterCommands();
        }
    }
    async fetchInsert(username, template, extraVars, opts) {
        const view = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
        if (!view) {
            new obsidian_1.Notice('Open a note to insert the last game.');
            return;
        }
        this.beginBusy();
        try {
            const label = opts?.timeClass ? ` ${opts.timeClass}` : '';
            const res = await getLastGameForUser(username, { timeClass: opts?.timeClass });
            if (!res) {
                new obsidian_1.Notice(opts?.timeClass ? `No recent ${opts.timeClass} games found or user not found.` : 'No recent games found or user not found.');
                return;
            }
            const vars = await buildTemplateVars(res.game, res.meColor, extraVars.lookupUsername || username, this.settings.dateFormat, this.settings.timeFormat);
            const text = renderTemplate(template, vars);
            view.editor.replaceSelection(text + '\n');
            // Place cursor at end of inserted line
            const cur = view.editor.getCursor('to');
            view.editor.setCursor(cur);
            new obsidian_1.Notice(`Inserted last${label} game.`);
        }
        catch (e) {
            console.error('[LastChess] Failed to fetch/insert', e);
            new obsidian_1.Notice('Failed to fetch from Chess.com. See console for details.');
        }
        finally {
            this.endBusy();
        }
    }
    // Insert one line per time class (bullet, blitz, rapid, daily)
    async loadSettings() {
        const data = await this.loadData();
        // Merge defaults with stored data first
        this.settings = Object.assign({}, exports.DEFAULT_SETTINGS, data);
        // Backward-compat: if legacy single `template` exists and no explicit templateDefault set by user, adopt it
        const legacyTemplate = data?.template;
        if (legacyTemplate && (!data || !data.templateDefault)) {
            this.settings.templateDefault = legacyTemplate;
        }
        // Migration: older versions used a combined date/time format in `dateFormat` (e.g., 'yyyy-MM-dd HH:mm').
        // If `timeFormat` is missing in stored data, attempt to split `dateFormat` on whitespace.
        const storedDateFormat = data?.dateFormat;
        const storedTimeFormat = data?.timeFormat;
        if (!storedTimeFormat) {
            if (storedDateFormat && /\s/.test(storedDateFormat)) {
                const parts = storedDateFormat.split(/\s+/).filter(Boolean);
                if (parts.length >= 2) {
                    this.settings.dateFormat = parts[0] || exports.DEFAULT_SETTINGS.dateFormat;
                    this.settings.timeFormat = parts.slice(1).join(' ') || exports.DEFAULT_SETTINGS.timeFormat;
                }
                else {
                    // Heuristic: if it seems time-like, set as timeFormat; else as dateFormat
                    if (/[Hh]/.test(storedDateFormat)) {
                        this.settings.timeFormat = storedDateFormat;
                        this.settings.dateFormat = exports.DEFAULT_SETTINGS.dateFormat;
                    }
                    else {
                        this.settings.dateFormat = storedDateFormat;
                        this.settings.timeFormat = exports.DEFAULT_SETTINGS.timeFormat;
                    }
                }
            }
            else if (storedDateFormat) {
                // If only one component provided
                if (/[Hh]/.test(storedDateFormat)) {
                    this.settings.timeFormat = storedDateFormat;
                    this.settings.dateFormat = exports.DEFAULT_SETTINGS.dateFormat;
                }
                else {
                    this.settings.dateFormat = storedDateFormat;
                    this.settings.timeFormat = exports.DEFAULT_SETTINGS.timeFormat;
                }
            }
        }
    }
    async saveSettings() {
        // Persist only known settings
        const toSave = {
            username: this.settings.username ?? exports.DEFAULT_SETTINGS.username,
            templateDefault: this.settings.templateDefault ?? exports.DEFAULT_SETTINGS.templateDefault,
            templateOtherUser: this.settings.templateOtherUser ?? exports.DEFAULT_SETTINGS.templateOtherUser,
            dateFormat: this.settings.dateFormat ?? exports.DEFAULT_SETTINGS.dateFormat,
            timeFormat: this.settings.timeFormat ?? exports.DEFAULT_SETTINGS.timeFormat,
            lastLookupUsername: this.settings.lastLookupUsername ?? exports.DEFAULT_SETTINGS.lastLookupUsername,
        };
        await this.saveData(toSave);
    }
}
exports.default = LastChessComGamePlugin;
