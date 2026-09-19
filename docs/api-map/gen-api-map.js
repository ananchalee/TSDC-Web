/* =====================================================================
   สร้างเอกสาร "แต่ละเมนูยิง API ตัวไหน ใช้ตารางอะไร อยู่บนเครื่องไหน"

   วิธีใช้      node docs/api-map/gen-api-map.js
   ได้ไฟล์      docs/api-map/tsdc-api-map.html

   สคริปต์นี้ไม่ได้เขียนข้อมูลเอง แต่ไล่อ่านจากซอร์สจริงทุกครั้งที่รัน
     1. app-routing.module.ts   -> รายชื่อเมนู + component + version
     2. component .ts แต่ละตัว  -> เรียก dataService.<เมธอด> อะไรบ้าง
     3. data.service.ts         -> เมธอดนั้นยิงไป URL ไหน (แยกได้ว่า api / api2 / api99)
     4. ไฟล์ API ทั้งสามตัว      -> endpoint นั้นใช้ตารางอะไร เขียนไหม ข้ามเครื่องไหม

   เพิ่มเมนูใหม่หรือ endpoint ใหม่แล้ว รันซ้ำได้เลย ไม่ต้องแก้สคริปต์
   ถ้าย้ายที่เก็บซอร์สของ API ให้แก้ค่าใน APIS ข้างล่างอย่างเดียว
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '../../src/app') + '/';
const OUT = path.join(__dirname, 'tsdc-api-map.html');

const APIS = [
  { key: 'api', label: '/api', port: '10.26.1.21 : 1661', cls: 'a1',
    db: 'API_TSDC (10.26.1.21) · TSDC_INTERNAL',
    show: 'TSDC-Api.21\\API\\tsdc-project\\server\\api.js',
    file: 'D:/TSDC PROJECT/TSDC-Api.21/API/tsdc-project/server/api.js' },
  { key: 'api2', label: '/api2', port: '10.26.1.21 : 1665', cls: 'a2',
    db: 'API_TSDC (10.26.1.21) · TSDC_INTERNAL',
    show: 'TSDC-Api.21\\API\\tsdc-project Old\\server\\api2.js',
    file: 'D:/TSDC PROJECT/TSDC-Api.21/API/tsdc-project Old/server/api2.js' },
  { key: 'api99', label: '/api99', port: '10.26.1.13 : 1665', cls: 'a3',
    db: '10.26.1.11 · TSDC_Conveyor',
    show: 'S.13\\_API\\tsdc-project\\server\\aum.js',
    file: 'D:/TSDC PROJECT/S.13/_API/tsdc-project/server/aum.js' },
];

/* กลุ่มเมนูตามที่จัดไว้ใน sidebar — route ที่ไม่อยู่ในนี้จะไปกอง "อื่นๆ" */
const GROUP = {
  'monit-statusRTS': 'Monitor', 'monit-InterfaceError-ManH': 'Monitor',
  'monit-Trackorderinternal': 'Monitor', 'monitor-waveorde': 'Monitor',
  'register-pack': 'Register',
  'audit-check': 'Audit & Check', 'audit-check-tracking': 'Audit & Check',
  'audit-check-fullcarton': 'Audit & Check', 'confirm-qty-groupsku': 'Audit & Check',
  'AWB': 'Audit & Check', 'edit-box': 'Audit & Check',
  'audit-check-Print-Old': 'Audit & Check', 'audit-check-Print-Old-Full': 'Audit & Check',
  'Outbound-Sacn-Tracking': 'Outbound', 'Outbound-Routing': 'Outbound',
  'Outbound-SignatureOrderCancel': 'Outbound',
  'report-sorter': 'Report', 'report-printordercancel': 'Report',
  'report-packinglist': 'Report', 'report-printWaveOrder': 'Report',
  'report-printTrackingGroupSku': 'Report',
  'tsuruha-orderdetail': 'Tsuruha', 'tsuruha-mappinginvoice': 'Tsuruha',
};
const GROUP_ORDER = ['Audit & Check', 'Outbound', 'Report', 'Monitor', 'Register', 'Tsuruha', 'อื่นๆ'];

/* คำที่ไม่ใช่ชื่อตาราง แต่ regex จะไปคว้ามาถ้าไม่กรองทิ้ง */
const NOISE = new Set(('select from where and or as on set values order group by a b c t u x table dual openquery sys ' +
  'inserted deleted cte max min count sum case when then else end null not exists with nolock left right inner outer ' +
  'join union all distinct top into convert cast getdate datediff dateadd isnull row_number over partition substring ' +
  'ltrim rtrim replace stuff xml path').split(' '));

function analyseSql(sql) {
  const tables = new Set(), remote = new Set(), writes = new Set();
  /* ชื่อ 4 ส่วน [SERVER].[DB].[schema].[TABLE] = query ข้ามเครื่องผ่าน linked server */
  const re4 = /\[?([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[A-Za-z_][A-Za-z0-9_\-]*)\]?\s*\.\s*\[?([A-Za-z0-9_]+)\]?\s*\.\s*\[?([A-Za-z0-9_]*)\]?\s*\.\s*\[?([A-Za-z0-9_]+)\]?/g;
  let m;
  while ((m = re4.exec(sql))) {
    if (/^[0-9.]+$/.test(m[1]) || /^[A-Z_]{3,}$/.test(m[1])) remote.add(m[1] + ' › ' + m[2] + ' › ' + m[4]);
  }
  const local = sql.replace(re4, ' ');
  for (const g of local.matchAll(/\b(from|join|into|update|delete\s+from)\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?/gi)) {
    if (!NOISE.has(g[2].toLowerCase())) tables.add(g[2]);
  }
  for (const g of sql.matchAll(/\b(insert\s+into|update|delete\s+from)\s+\[?([A-Za-z0-9_.\[\]]+)\]?/gi)) {
    const t = g[2].replace(/[\[\]]/g, '').split('.').pop();
    if (!NOISE.has(t.toLowerCase())) writes.add(t);
  }
  return { tables: [...tables], remote: [...remote], writes: [...writes] };
}

/* ---------- 1) endpoint ของ API ทั้งสามตัว ---------- */
const endpoints = {}, missingApiFiles = [];
for (const A of APIS) {
  if (!fs.existsSync(A.file)) { missingApiFiles.push(A.file); continue; }
  const src = fs.readFileSync(A.file, 'utf8');
  const marks = [...src.matchAll(/app\.(get|post|put|delete)\(\s*['"]\/([^'"]+)['"]/g)];
  marks.forEach((mk, i) => {
    const body = src.slice(mk.index, i + 1 < marks.length ? marks[i + 1].index : src.length);
    const sql = [...body.matchAll(/`([\s\S]*?)`/g)].map(x => x[1]).join('\n');
    endpoints[(A.key + ':' + mk[2]).toLowerCase()] =
      Object.assign({ api: A.key, verb: mk[1].toUpperCase(), name: mk[2] }, analyseSql(sql));
  });
}

/* ---------- 2) data.service.ts : เมธอด -> URL ---------- */
const ds = fs.readFileSync(WEB + 'services/data.service.ts', 'utf8');
const methods = {};
const ms = [...ds.matchAll(/\n\s{0,4}(?:public\s+|private\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*(?::[^={]*)?\{/g)];
ms.forEach((mk, i) => {
  const body = ds.slice(mk.index, i + 1 < ms.length ? ms[i + 1].index : ds.length);
  const u = body.match(/['"`](http:\/\/[^'"`]+)['"`]/);
  if (u) methods[mk[1]] = u[1];
});

/* ---------- 3) route -> component -> เรียกเมธอดอะไร ---------- */
const routing = fs.readFileSync(WEB + 'app-routing.module.ts', 'utf8');
const imports = {};
for (const i of routing.matchAll(/import\s*\{\s*([A-Za-z0-9_]+)\s*\}\s*from\s*['"]([^'"]+)['"]/g)) imports[i[1]] = i[2];

const keyOf = u => { const m = u.match(/:(?:1661|1665)\/(api2|api99|api)\/(.+)$/); return m ? (m[1] + ':' + m[2]).toLowerCase() : null; };
const pages = [], unmapped = [], tableIndex = {};
for (const r of routing.matchAll(/path:\s*'([^']+)'\s*,\s*component:\s*([A-Za-z0-9_]+)\s*,?\s*(?:data:\s*\{([^}]*)\})?/g)) {
  const data = r[3] || '', g = k => { const m = data.match(new RegExp(k + ":\\s*'([^']*)'")); return m ? m[1] : ''; };
  const p = { path: r[1], menubar: g('menubar') || r[1], version: g('version'), lastupdate: g('lastupdate'),
              group: GROUP[r[1]] || 'อื่นๆ', eps: [] };
  const src = imports[r[2]] ? path.resolve(WEB, imports[r[2]].replace(/^\.\//, '')) + '.ts' : '';
  if (src && fs.existsSync(src)) {
    const t = fs.readFileSync(src, 'utf8'), seen = new Set();
    for (const c of new Set([...t.matchAll(/dataService\.([A-Za-z0-9_]+)\s*\(/g)].map(x => x[1]))) {
      if (!methods[c]) continue;
      const k = keyOf(methods[c]), e = k ? endpoints[k] : null;
      if (!e) { unmapped.push({ page: p.path, method: c, url: methods[c] }); continue; }
      if (seen.has(k)) continue; seen.add(k);
      e.tables.sort(); e.remote.sort(); e.writes.sort();
      p.eps.push(e);
    }
  }
  const T = new Set(), R = new Set(), W = new Set(), A = new Set();
  p.eps.forEach(e => { e.tables.forEach(x => T.add(x)); e.remote.forEach(x => R.add(x)); e.writes.forEach(x => W.add(x)); A.add(e.api); });
  T.forEach(t => { (tableIndex[t] = tableIndex[t] || { pages: new Set(), write: false }).pages.add(p.menubar); });
  W.forEach(t => { if (tableIndex[t]) tableIndex[t].write = true; });
  Object.assign(p, { tables: [...T].sort(), remote: [...R].sort(), writes: [...W].sort(), apis: [...A].sort() });
  pages.push(p);
}
const tIdx = Object.entries(tableIndex).map(([t, v]) => ({ table: t, pages: [...v.pages].sort(), write: v.write }))
  .sort((a, b) => b.pages.length - a.pages.length || a.table.localeCompare(b.table));

/* ---------- 4) เขียน HTML ---------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const META = {}; APIS.forEach(a => META[a.key] = a);
const chip = a => '<span class="chip ' + META[a].cls + '">' + META[a].label + '</span>';
const tbl = (t, w) => '<code class="t' + (w ? ' w' : '') + '">' + esc(t) + '</code>';
const slug = s => s.replace(/[^A-Za-z0-9_-]/g, '_');
const cnt = {}; Object.values(endpoints).forEach(e => cnt[e.api] = (cnt[e.api] || 0) + 1);
const shown = pages.filter(p => p.path !== '');
const byGroup = {}; shown.forEach(p => (byGroup[p.group] = byGroup[p.group] || []).push(p));
const THAIDATE = (d => d.getDate() + ' ' + ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'][d.getMonth()] + ' ' + d.getFullYear())(new Date());

let overview = '', detail = '';
for (const g of GROUP_ORDER) {
  const list = (byGroup[g] || []).sort((a, b) => b.eps.length - a.eps.length);
  if (!list.length) continue;
  overview += '<tr class="grp"><td colspan="6">' + esc(g) + '</td></tr>';
  detail += '<h3 class="gh">' + esc(g) + '</h3>';
  for (const p of list) {
    const find = esc((p.menubar + ' ' + p.path + ' ' + p.tables.join(' ')).toLowerCase());
    overview += '<tr class="row" data-find="' + find + '">'
      + '<td><a href="#m-' + slug(p.path) + '">' + esc(p.menubar) + '</a><span class="sub">' + esc(p.path) + '</span></td>'
      + '<td class="num">' + (p.version ? esc(p.version) : '—') + '</td><td>' + p.apis.map(chip).join(' ') + '</td>'
      + '<td class="num">' + p.eps.length + '</td><td class="num">' + p.tables.length + '</td>'
      + '<td class="num">' + (p.remote.length ? '<span class="rem">' + p.remote.length + '</span>' : '—') + '</td></tr>';
    const rows = p.eps.slice().sort((a, b) => a.name.localeCompare(b.name)).map(e =>
      '<tr><td>' + chip(e.api) + '<code class="ep">' + esc(e.name) + '</code><span class="verb">' + e.verb + '</span></td>'
      + '<td>' + (e.tables.length ? e.tables.map(t => tbl(t, e.writes.indexOf(t) > -1)).join(' ') : '<span class="none">ไม่มีคำสั่ง SQL ตรงๆ</span>') + '</td>'
      + '<td>' + e.remote.map(r => '<span class="hop">' + esc(r) + '</span>').join(' ') + '</td></tr>').join('');
    detail += '<section class="menu" id="m-' + slug(p.path) + '" data-find="'
      + esc((p.menubar + ' ' + p.path + ' ' + p.tables.join(' ') + ' ' + p.eps.map(e => e.name).join(' ')).toLowerCase()) + '">'
      + '<header><h4>' + esc(p.menubar) + '</h4><p class="meta"><code>/' + esc(p.path) + '</code>'
      + (p.version ? ' · v' + esc(p.version) + ' · แก้ล่าสุด ' + esc(p.lastupdate) : '')
      + ' · ' + p.eps.length + ' endpoint · ' + p.tables.length + ' ตาราง'
      + (p.writes.length ? ' · เขียน ' + p.writes.length + ' ตาราง' : ' · อ่านอย่างเดียว') + '</p></header>'
      + '<div class="scroll"><table class="ep-t"><thead><tr><th>Endpoint</th><th>ตารางที่ใช้</th><th>ข้ามเครื่อง</th></tr></thead><tbody>'
      + rows + '</tbody></table></div></section>';
  }
}
const idxRows = tIdx.map(t => '<tr data-find="' + esc((t.table + ' ' + t.pages.join(' ')).toLowerCase()) + '">'
  + '<td>' + tbl(t.table, t.write) + '</td><td class="num">' + t.pages.length + '</td>'
  + '<td class="pg">' + t.pages.map(esc).join(' · ') + '</td></tr>').join('');
const unmapList = unmapped.length
  ? '<li><b>' + unmapped.length + ' endpoint แมปไม่ได้</b> — ' + [...new Set(unmapped.map(u => u.method))].map(m => '<code>' + esc(m) + '</code>').join(', ')
    + ' ไฟล์ซอร์สของ API ที่มีบนเครื่องนี้ไม่มี endpoint พวกนี้ (สำเนาเก่ากว่าตัวที่รันจริง) จึงยังไม่รู้ว่าใช้ตารางอะไร</li>'
  : '';
const DARK = ['--paper:#0e1319; --card:#151b23; --ink:#e6eaef; --ink-2:#a3aeba; --ink-3:#79848f;',
  '--line:#28313b; --line-2:#1d242c;',
  '--a1:#93a6f5; --a1-bg:#1c2542; --a2:#5fc8bf; --a2-bg:#0e2b2a; --a3:#b899f0; --a3-bg:#241a3a;',
  '--write:#f08a6c; --write-bg:#331710; --hop:#e0a944; --hop-bg:#2e2308;'].join('\n  ');

const html = `<title>แผนที่เมนู API และตารางของ TSDC</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap">
<style>
:root{
  --paper:#f6f7f9; --card:#ffffff; --ink:#151b23; --ink-2:#48535f; --ink-3:#78838f;
  --line:#dee2e8; --line-2:#eceff3;
  --a1:#3550c4; --a1-bg:#e8ecfb; --a2:#0d6f6a; --a2-bg:#dff1ef; --a3:#6f45b8; --a3-bg:#eee7fa;
  --write:#a83218; --write-bg:#fbe9e4; --hop:#8a5406; --hop-bg:#fbf0dc;
  --mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;
  --sans:"IBM Plex Sans Thai","Segoe UI",system-ui,sans-serif;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  ${DARK}
}}
:root[data-theme="dark"]{
  ${DARK}
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px 80px}
code{font-family:var(--mono);font-size:.82em}
h1,h2,h3,h4{text-wrap:balance;margin:0}
.num{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
header.top{padding:56px 0 28px;border-bottom:2px solid var(--ink)}
.eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0}
h1{font-size:clamp(27px,4.2vw,40px);font-weight:700;letter-spacing:-.015em;margin:8px 0 12px;line-height:1.25}
.lede{color:var(--ink-2);max-width:66ch;margin:0}
.stats{display:flex;flex-wrap:wrap;gap:30px;margin-top:24px}
.stats div{display:flex;flex-direction:column}
.stats b{font-family:var(--mono);font-size:25px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.15}
.stats span{font-size:12px;color:var(--ink-3)}
h2{font-size:12px;font-family:var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin:52px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.apis{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));border-left:1px solid var(--line-2)}
.api{padding:16px 20px 20px;border-right:1px solid var(--line-2);border-top:3px solid var(--c)}
.api.a1{--c:var(--a1)} .api.a2{--c:var(--a2)} .api.a3{--c:var(--a3)}
.api h3{font-family:var(--mono);font-size:15px;font-weight:600;color:var(--c)}
.api dl{margin:12px 0 0;display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:13px}
.api dt{color:var(--ink-3)}
.api dd{margin:0;font-family:var(--mono);font-size:11.5px;word-break:break-all;color:var(--ink-2)}
.tools{position:sticky;top:0;z-index:5;background:var(--paper);padding:14px 0 12px;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:center;flex-wrap:wrap}
#q{flex:1;min-width:230px;font-family:var(--sans);font-size:14px;padding:9px 13px;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:2px}
#q:focus{outline:2px solid var(--a1);outline-offset:1px}
.hint{font-size:12px;color:var(--ink-3)}
#hits{font-family:var(--mono);font-size:12px;color:var(--ink-3);font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:11px;font-family:var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
th.num{text-align:right}
td{padding:9px 10px;border-bottom:1px solid var(--line-2);vertical-align:top}
tr.grp td{font-size:11px;font-family:var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);padding:22px 10px 6px;border-bottom:1px solid var(--line)}
tr.row a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--line);font-weight:500}
tr.row a:hover,tr.row a:focus{border-color:var(--a1);color:var(--a1)}
.sub{display:block;font-family:var(--mono);font-size:11px;color:var(--ink-3)}
.rem{color:var(--hop);font-weight:600}
.chip{display:inline-block;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.03em;padding:1px 6px;border-radius:2px;vertical-align:1px}
.chip.a1{color:var(--a1);background:var(--a1-bg)}
.chip.a2{color:var(--a2);background:var(--a2-bg)}
.chip.a3{color:var(--a3);background:var(--a3-bg)}
.gh{font-size:12px;font-family:var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:46px 0 0}
section.menu{border-top:1px solid var(--line);padding:20px 0 8px}
section.menu header{margin-bottom:12px}
section.menu h4{font-size:19px;font-weight:600;letter-spacing:-.01em}
.meta{margin:4px 0 0;font-size:12.5px;color:var(--ink-3)}
.meta code{color:var(--ink-2)}
.scroll{overflow-x:auto}
.ep-t td:first-child{white-space:nowrap}
code.ep{font-weight:500;margin-left:7px}
.verb{font-family:var(--mono);font-size:10px;color:var(--ink-3);margin-left:7px}
code.t{display:inline-block;background:var(--line-2);color:var(--ink-2);padding:1px 6px;border-radius:2px;margin:1px 2px 1px 0}
code.t.w{background:var(--write-bg);color:var(--write);font-weight:500}
.hop{display:inline-block;font-family:var(--mono);font-size:11px;background:var(--hop-bg);color:var(--hop);padding:1px 7px;border-radius:2px;margin:1px 2px 1px 0;white-space:nowrap}
.none{color:var(--ink-3);font-size:12px}
td.pg{color:var(--ink-2);font-size:13px;min-width:260px}
.legend{display:flex;gap:22px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-2);margin-top:16px}
.note{border-left:3px solid var(--hop);background:var(--card);padding:14px 18px}
.note h4{font-size:14px;font-weight:600;margin-bottom:6px}
.note ul{margin:0;padding-left:20px;color:var(--ink-2);font-size:13.5px}
.note li{margin:6px 0}
footer{margin-top:56px;padding-top:18px;border-top:1px solid var(--line);font-size:12px;color:var(--ink-3)}
.hidden{display:none!important}
@media (max-width:720px){.wrap{padding:0 16px 60px}.stats{gap:20px}}
</style>

<div class="wrap">
<header class="top">
  <p class="eyebrow">TSDC Web · เอกสารอ้างอิงระบบ</p>
  <h1>แต่ละเมนูยิง API ตัวไหน ใช้ตารางอะไร อยู่บนเครื่องไหน</h1>
  <p class="lede">สร้างอัตโนมัติด้วย <code>node docs/api-map/gen-api-map.js</code> ซึ่งไล่อ่านซอร์สจริงทุกครั้งที่รัน — จาก <code>app-routing.module.ts</code> ไปหาเมธอดใน <code>data.service.ts</code> ไปหา endpoint ในไฟล์ API แล้วอ่านชื่อตารางจากคำสั่ง SQL ของ endpoint นั้น เพิ่มเมนูใหม่แล้วรันซ้ำได้เลย</p>
  <div class="stats">
    <div><b>${shown.length}</b><span>เมนู</span></div>
    <div><b>${shown.reduce((a, p) => a + p.eps.length, 0)}</b><span>endpoint ที่ถูกเรียกจริง</span></div>
    <div><b>${Object.keys(endpoints).length}</b><span>endpoint ที่มีทั้งหมด</span></div>
    <div><b>${tIdx.length}</b><span>ตารางที่ถูกแตะ</span></div>
    <div><b>${tIdx.filter(t => t.write).length}</b><span>ตารางที่ถูกเขียน</span></div>
  </div>
</header>

<h2>API สามตัว คนละ process คนละพอร์ต</h2>
<div class="apis">
${APIS.map(a => '  <div class="api ' + a.cls + '"><h3>' + a.label + '</h3><dl>'
  + '<dt>ที่อยู่</dt><dd>' + a.port + '</dd><dt>ไฟล์</dt><dd>' + esc(a.show) + '</dd>'
  + '<dt>ฐานข้อมูล</dt><dd>' + a.db + '</dd><dt>endpoint</dt><dd>' + (cnt[a.key] || 0) + '</dd></dl></div>').join('\n')}
</div>
<div class="legend">
  <span>${tbl('TABLE_NAME', false)} อ่านอย่างเดียว</span>
  <span>${tbl('TABLE_NAME', true)} มีคำสั่งเขียน (insert / update / delete)</span>
  <span><span class="hop">10.26.1.11 › DB › TABLE</span> วิ่งข้ามเครื่องผ่าน linked server</span>
</div>

<h2>สรุปทุกเมนู</h2>
<div class="tools">
  <input id="q" type="search" placeholder="ค้นหา — ชื่อเมนู, ชื่อตาราง, ชื่อ endpoint" aria-label="ค้นหา">
  <span id="hits"></span><span class="hint">กรองพร้อมกันทั้งสามส่วน</span>
</div>
<div class="scroll"><table id="ov">
  <thead><tr><th>เมนู</th><th class="num">เวอร์ชัน</th><th>API</th><th class="num">endpoint</th><th class="num">ตาราง</th><th class="num">ข้ามเครื่อง</th></tr></thead>
  <tbody>${overview}</tbody></table></div>

<h2>รายละเอียดรายเมนู</h2>
${detail}

<h2>ดัชนีตาราง — ตารางนี้ถูกใช้ที่หน้าไหนบ้าง</h2>
<div class="scroll"><table id="ti">
  <thead><tr><th>ตาราง</th><th class="num">กี่หน้า</th><th>หน้าที่ใช้</th></tr></thead>
  <tbody>${idxRows}</tbody></table></div>

<h2>ข้อจำกัดของเอกสารนี้</h2>
<div class="note"><h4>อ่านก่อนเอาไปอ้างอิง</h4><ul>
  <li><b>ซอร์สที่อ่านเป็นสำเนาบนเครื่อง dev</b> ตัวที่รันจริงของ <code>/api</code> อยู่ที่ <code>D:\\Project TSDC-internal\\API\\tsdc-project\\server\\api.js</code> ซึ่งคนละที่กับที่แก้โค้ด ถ้าสองตัวไม่ตรงกัน เอกสารนี้จะตามตัวบนเครื่อง dev</li>
  ${unmapList}
  <li><b>ชื่อตารางได้จากการอ่านข้อความ SQL ไม่ได้รันจริง</b> endpoint ที่ประกอบ SQL เป็น string จากค่าที่ frontend ส่งมา (เช่น <code>conditiontracking</code>) อาจมีตารางที่มองไม่เห็นจากซอร์ส</li>
  <li><b>stored procedure ยังไม่ได้ไล่ต่อ</b> ถ้า endpoint ไปเรียก procedure ตารางที่ procedure นั้นแตะจะไม่ปรากฏที่นี่</li>
  <li>Express ไม่สนตัวพิมพ์เล็กใหญ่ของ path — frontend เรียก <code>matchItemInConSorter</code> แต่ API ประกาศชื่อ <code>matchItemInConSORTER</code> ใช้งานได้ปกติ เอกสารนี้จับคู่แบบไม่สนตัวพิมพ์</li>
</ul></div>

<footer>สร้างเมื่อ ${THAIDATE} · เพิ่มเมนูหรือ endpoint ใหม่แล้วให้รัน <code>node docs/api-map/gen-api-map.js</code> ใหม่</footer>
</div>

<script>
(function () {
  var q = document.getElementById('q'), hits = document.getElementById('hits');
  var ovRows = [].slice.call(document.querySelectorAll('#ov tbody tr.row'));
  var grpRows = [].slice.call(document.querySelectorAll('#ov tbody tr.grp'));
  var menus = [].slice.call(document.querySelectorAll('section.menu'));
  var ghs = [].slice.call(document.querySelectorAll('.gh'));
  var tiRows = [].slice.call(document.querySelectorAll('#ti tbody tr'));
  function apply() {
    var s = q.value.trim().toLowerCase(), n = 0;
    ovRows.forEach(function (r) {
      var ok = !s || r.getAttribute('data-find').indexOf(s) > -1;
      r.classList.toggle('hidden', !ok); if (ok) n++;
    });
    menus.forEach(function (m) { m.classList.toggle('hidden', !(!s || m.getAttribute('data-find').indexOf(s) > -1)); });
    tiRows.forEach(function (r) { r.classList.toggle('hidden', !(!s || r.getAttribute('data-find').indexOf(s) > -1)); });
    grpRows.forEach(function (g) {
      var vis = false, el = g.nextElementSibling;
      while (el && !el.classList.contains('grp')) {
        if (el.classList.contains('row') && !el.classList.contains('hidden')) vis = true;
        el = el.nextElementSibling;
      }
      g.classList.toggle('hidden', !vis);
    });
    ghs.forEach(function (h) {
      var vis = false, el = h.nextElementSibling;
      while (el && el.tagName === 'SECTION') {
        if (!el.classList.contains('hidden')) vis = true;
        el = el.nextElementSibling;
      }
      h.classList.toggle('hidden', !vis);
    });
    hits.textContent = s ? n + ' / ' + ovRows.length + ' เมนู' : '';
  }
  q.addEventListener('input', apply);
})();
</script>
`;
fs.writeFileSync(OUT, html);
console.log('เขียน ' + path.relative(process.cwd(), OUT) + '  (' + (html.length / 1024).toFixed(0) + ' KB)');
console.log('  เมนู ' + shown.length + ' · endpoint ที่ถูกเรียก ' + shown.reduce((a, p) => a + p.eps.length, 0)
  + ' · endpoint ทั้งหมด ' + Object.keys(endpoints).length + ' · ตาราง ' + tIdx.length);
if (missingApiFiles.length) console.log('  !! หาไฟล์ API ไม่เจอ: ' + missingApiFiles.join(', '));
if (unmapped.length) console.log('  !! แมป endpoint ไม่ได้ ' + unmapped.length + ' จุด: '
  + [...new Set(unmapped.map(u => u.page + '/' + u.method))].join(', '));
