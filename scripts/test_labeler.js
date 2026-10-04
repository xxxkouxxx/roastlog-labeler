// Local regression checks: no filesystem writes, browser storage, network or printer access.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
for (const script of scripts) {
    if (script[0].includes('type="importmap"')) JSON.parse(script[1]);
    else new vm.Script(script[1]);
}
const elements = new Map();
function element(id) {
    if (!elements.has(id)) elements.set(id, {
        value: id === 'label-size-select' ? '62x62' : '', textContent: '', innerHTML: '', disabled: false,
        attrs: {}, dataset: {}, className: '',
        setAttribute(name, value) { this.attrs[name] = value; },
        addEventListener() {}, querySelectorAll() { return []; },
        classList: { toggle() {}, add() {}, remove() {} },
        style: { setProperty(key, value) { this[key] = value; }, getPropertyValue(key) { return this[key] || ''; } }
    });
    return elements.get(id);
}
const canvasContext = new Proxy({ measureText: text => ({ width: String(text).length * 10 }) }, {
    get(target, key) { return key in target ? target[key] : () => {}; }
});
let storageWrites = 0;
let printed = 0;
const storage = new Map();
const context = vm.createContext({
    console, URL, Date, Math, Map, Set, setTimeout() {},
    window: { location: { protocol: 'http:', origin: 'http://localhost', pathname: '/', href: 'http://localhost/' },
        addEventListener() {}, print() { printed++; }, alert() {} },
    localStorage: { getItem: key => storage.get(key) || null, setItem(key, value) { storageWrites++; storage.set(key, value); } },
    document: { getElementById: element, querySelector: () => element('download'), fonts: { ready: Promise.resolve() },
        createElement: () => ({ width: 0, height: 0, getContext: () => canvasContext }) },
    lucide: { createIcons() {} }
});
const source = scripts.at(-1)[1];
vm.runInContext(source, context);
const run = code => vm.runInContext(code, context);
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }

(async () => {
    run(`beans = [normalizeBeanRecord({id:'fixture-1',name:'Test <bean>', countries:['COLOMBIA'], roast:'浅煎り',roastDate:'2026-10-02',weight:'100g',originNote:'Lot note', sour:0}),
        normalizeBeanRecord({id:'template-1',name:'Template',countries:['BRAZIL'],roastDate:''})];
        selectedBeanId = beans[0].id; publicLabels = []; remotePublicLabels = [];`);
    check('snapshot keeps lot note and zero taste value', () => {
        assert.equal(run('labelToBeanRecord(createLabelSnapshot(beans[0])).originNote'), 'Lot note');
        assert.equal(run('labelToBeanRecord(createLabelSnapshot(beans[0])).sour'), 0);
        assert.equal(run('labelContentMatches(createLabelSnapshot(beans[0]), beans[0])'), true);
        assert.equal(run("labelContentMatches(createLabelSnapshot(beans[0]), {...beans[0],originNote:'Changed'})"), false);
    });
    check('search escapes names and survives selection refresh', () => {
        element('search-input').value = 'test';
        run('renderBeansList()');
        assert.ok(element('beans-list').innerHTML.includes('Test &lt;bean&gt;'));
        assert.equal(element('bean-filter-count').textContent, '1 / 2 件を表示');
        run('renderBeansList()');
        assert.equal(element('bean-filter-count').textContent, '1 / 2 件を表示');
    });
    check('template and roasted filters combine with search', () => {
        run("setBeanFilter('template')");
        assert.equal(element('bean-filter-count').textContent, '0 / 2 件を表示');
        element('search-input').value = '';
        run('renderBeansList()');
        assert.equal(element('bean-filter-count').textContent, '1 / 2 件を表示');
        run("setBeanFilter('roasted')");
        assert.equal(element('bean-filter-count').textContent, '1 / 2 件を表示');
    });
    check('fixed theme sizes agree with the selector', () => {
        run("activeTheme = 'package'; syncLabelControls()");
        assert.equal(element('label-size-select').value, '62x90');
        assert.equal(element('label-size-select').disabled, true);
        run("activeTheme = 'simple-package'; syncLabelControls()");
        assert.equal(element('label-size-select').value, '62x62');
        run("activeTheme = 'front'; syncLabelControls()");
        assert.equal(element('label-size-select').disabled, false);
    });
    check('public viewing keeps original ID and inventory size', () => {
        run("viewingPublicLabelBean = labelToBeanRecord({...createLabelSnapshot(beans[0]),labelId:'existing-public-id'}); selectedBeanId = viewingPublicLabelBean.id;");
        assert.equal(run('getCurrentBean().name'), 'Test <bean>');
        assert.equal(run('getQrPayload(getCurrentBean())'), 'http://localhost/#label-existing-public-id');
        assert.equal(run('beans.length'), 2);
        run('updateLabelWorkflow(getCurrentBean())');
        assert.equal(element('export-label-button').disabled, true);
        const before = storageWrites;
        run('exportCurrentLabelData()');
        assert.equal(storageWrites, before);
    });
    check('empty roast date cannot be exported', () => {
        run('viewingPublicLabelBean = null; selectedBeanId = beans[1].id; updateLabelWorkflow(getCurrentBean())');
        assert.equal(element('export-label-button').disabled, true);
        const before = storageWrites;
        run('exportCurrentLabelData()');
        assert.equal(storageWrites, before);
    });
    check('file-match and draft-match stay distinct', () => {
        run('selectedBeanId = beans[0].id; remotePublicLabels = [createLabelSnapshot(beans[0])]; updateLabelWorkflow(getCurrentBean())');
        assert.equal(element('label-publication-status').textContent, '読込ファイルと内容一致');
        run("beans[0].originNote = 'Updated'; updateLabelWorkflow(getCurrentBean())");
        assert.equal(element('label-publication-status').textContent, '変更あり・再書き出しが必要');
        run('publicLabels = [createLabelSnapshot(beans[0])]; updateLabelWorkflow(getCurrentBean())');
        assert.equal(element('label-publication-status').textContent, '下書きあり・反映確認待ち');
    });
    check('printing sets correct physical size from public selection', () => {
        run('viewingPublicLabelBean = labelToBeanRecord(remotePublicLabels[0]); selectedBeanId = viewingPublicLabelBean.id');
        const area = element('printable-label-area');
        area.style.height = '385px';
        area.style.setProperty('--print-height', '90mm');
        run('printCurrentLabel()');
        assert.equal(printed, 1);
        assert.equal(element('print-page-style').textContent, '@page { size: 62mm 90mm; margin: 0; }');
        assert.ok(Math.abs(Number(area.style['--print-scale-y']) * 385 - 90 / 25.4 * 96) < .001);
    });
    // Canvas drawing is stubbed here; actual pixels and WebGL are checked in Browser.
    run('loadFrontLogoImage = async () => ({}); createExportQrCanvas = () => ({});');
    for (const theme of ['front', 'modern', 'package', 'simple-package']) {
        for (const size of ['62x29', '62x62', '62x90']) {
            const canvas = await run(`renderLabelCanvas(getCurrentBean(), '${theme}', '${size}')`);
            const mm = theme === 'package' ? 90 : theme === 'simple-package' ? 62 : Number(size.split('x')[1]);
            check(`canvas size ${theme} ${size}`, () => {
                assert.equal(canvas.width, Math.round(62 / 25.4 * 300));
                assert.equal(canvas.height, Math.round(mm / 25.4 * 300));
            });
        }
    }
    check('cleared selection blocks print', () => {
        run('selectedBeanId = null; viewingPublicLabelBean = null; printCurrentLabel()');
        assert.equal(printed, 1);
    });
    console.log(`${passed} checks passed. Real browser, WebGL and printer validation are separate.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
