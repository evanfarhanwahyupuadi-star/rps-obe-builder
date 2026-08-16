/*!
 * Smoke test otomatis untuk RPS OBE Builder.
 *
 * Melengkapi CHECKLIST.md — bukan pengganti. Ini hanya mengecek
 * alur data inti (tanpa menguji tampilan visual atau file yang
 * diunduh benar-benar terbuka rapi di Excel/Word).
 *
 * Cara pakai:
 *   1. cd dev
 *   2. npm install jsdom      (sekali saja)
 *   3. node smoke-test.js
 *
 * Keluar dengan exit code 0 kalau semua lolos, 1 kalau ada yang gagal.
 */
const { JSDOM } = require('jsdom');
const path = require('path');

const appDir = path.join(__dirname, '..');
const indexPath = path.join(appDir, 'index.html');

const errors = [];
const failures = [];

function check(label, condition) {
  if (condition) {
    console.log('  \u2713 ' + label);
  } else {
    console.log('  \u2717 ' + label);
    failures.push(label);
  }
}

JSDOM.fromFile(indexPath, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'file://' + appDir + '/',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.addEventListener('error', (e) => {
      errors.push(e.error ? (e.error.stack || e.error.message) : e.message);
    });
    window.console.error = (...args) => { errors.push('console.error: ' + args.join(' ')); };
  }
}).then(dom => {
  setTimeout(() => {
    const window = dom.window;
    const document = window.document;
    const $ = (id) => document.getElementById(id);
    const click = (id) => $(id).dispatchEvent(new window.Event('click', { bubbles: true }));
    const change = (id) => $(id).dispatchEvent(new window.Event('change', { bubbles: true }));

    console.log('\n[1] Tab Pilih Mata Kuliah');
    check('XLSX library termuat (versi terbaca)', !!window.XLSX && !!window.XLSX.version);
    check('dropdown mata kuliah terisi', $('f-mkPicker').options.length > 1);
    $('f-mkPicker').selectedIndex = 1;
    change('f-mkPicker');
    check('field Kode MK terisi setelah pilih MK', $('f-kodeMK').value.length > 0);

    console.log('\n[2] Tab CPL, CPMK & Sub-CPMK');
    click('btn-generate-cpmk');
    const cpmkCount = window.eval('state.cpmk.length');
    check('CPMK ter-generate dari Bahan Kajian (>0)', cpmkCount > 0);
    click('btn-add-subcpmk');
    const subCount = window.eval('state.subCpmk.length');
    check('tambah Sub-CPMK manual berhasil (>0)', subCount > 0);

    console.log('\n[3] Tab Rencana Mingguan');
    const weekRows = document.querySelectorAll('#week-tbody tr').length;
    check('16 baris minggu ter-render', weekRows === 16);

    console.log('\n[4] Tab Rencana Evaluasi');
    // Pindah tab memicu renderEvaluasi(), yang mensinkronkan 1 entri
    // evaluasi per Sub-CPMK -- perlu terjadi sebelum hitung bobot
    // (meniru alur dosen: isi Sub-CPMK dulu, baru buka tab Evaluasi).
    document.querySelector('button[data-tab="evaluasi"]').dispatchEvent(new window.Event('click', { bubbles: true }));
    click('btn-auto-bobot');
    const totalBobot = window.eval(
      'state.evaluasi.reduce((s,e)=>s+(parseFloat(e.bobot)||0),0)'
    );
    check('total bobot otomatis mendekati 100% (' + totalBobot.toFixed(1) + '%)',
      Math.abs(totalBobot - 100) < 1);

    console.log('\n[5] Tab Rekap Penilaian');
    const mhsBefore = window.eval('state.mahasiswa.length');
    click('btn-add-mhs');
    const mhsAfter = window.eval('state.mahasiswa.length');
    check('tambah mahasiswa manual bertambah 1', mhsAfter === mhsBefore + 1);
    click('btn-add-gs');
    check('tambah baris kriteria penilaian berhasil', window.eval('state.gradingScale.length') > 0);

    console.log('\n[6] Tab Rubrik Tugas');
    click('btn-add-rubrik');
    check('tambah rubrik berhasil', window.eval('state.rubrik.length') > 0);

    console.log('\n[7] Save / Load state');
    const savedJson = window.eval('JSON.stringify(state)');
    check('state bisa di-serialize ke JSON', savedJson.length > 100);
    let parsedOk = false;
    try { JSON.parse(savedJson); parsedOk = true; } catch (e) {}
    check('hasil JSON valid dan bisa di-parse ulang', parsedOk);

    console.log('\n[8] Error JavaScript selama pengujian');
    check('tidak ada error JS yang tertangkap', errors.length === 0);
    if (errors.length) errors.forEach(e => console.log('    ! ' + e));

    console.log('\n' + '='.repeat(50));
    if (failures.length === 0) {
      console.log('SEMUA LOLOS (' + (8) + ' kelompok cek)');
      process.exit(0);
    } else {
      console.log('GAGAL pada ' + failures.length + ' pemeriksaan:');
      failures.forEach(f => console.log('  - ' + f));
      process.exit(1);
    }
  }, 1500);
}).catch(e => {
  console.log('FATAL: gagal memuat index.html —', e.stack || e.message);
  process.exit(1);
});
