/*!
 * RPS OBE Builder - Save/Load, export, and app init
 * Save/Load JSON, export CSV/DOC, and the startup render calls (must load last).
 * Depends on: vendor/xlsx.full.min.js, and files loaded before this one
 *   (see index.html for the required <script> order).
 */
// ============ SAVE / LOAD JSON ============
document.getElementById('btn-save-json').addEventListener('click',()=>{
  const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const nama = (state.identitas.kodeMK || 'draft-rps').replace(/[^a-z0-9\-]/gi,'_');
  a.href=url; a.download='RPS-'+nama+'.json'; a.click(); URL.revokeObjectURL(url);
});
document.getElementById('btn-load-json').addEventListener('click',()=>{document.getElementById('file-load').click();});
document.getElementById('file-load').addEventListener('change',e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = evt=>{
    try{
      const loaded = JSON.parse(evt.target.result);
      state = Object.assign(state, loaded);
      if(state.identitas && !('logoDataUrl' in state.identitas)) state.identitas.logoDataUrl = DEFAULT_LOGO_DATA_URL;
      if(!state.cplSelected) state.cplSelected=[];
      if(!state.bkAssigned) state.bkAssigned=[];
      if(!state.subCpmk) state.subCpmk=[];
      if(!state.referensi) state.referensi=[];
      if(!state.evaluasi) state.evaluasi=[];
      if(!state.rubrik) state.rubrik=[];
      (state.weeks||[]).forEach(w=>{
        if(typeof w.bentukManual!=='boolean') w.bentukManual=false;
        if(typeof w.metodeManual!=='boolean') w.metodeManual=false;
      });
      state.rubrik.forEach(r=>{
        if(!r.skorByStudent) r.skorByStudent={};
        if(!r.subjek) r.subjek=[];
        (r.aspects||[]).forEach(a=>{ if(!a.deskriptor) a.deskriptor=genDeskriptorLevels(a.nama); });
        propagateRubrikToNilai(r);
      });
      hydrateForm();
    }catch(err){ alert('File draf tidak valid atau rusak.'); }
  };
  reader.readAsText(file);
});
function hydrateForm(){
  idFields.forEach(f=>{const el=document.getElementById('f-'+f); if(el) el.value = state.identitas[f]||'';});
  renderCplDisplay();renderBkDisplay();renderCpmk();renderSubCpmk();renderReferensi();renderWeeks();renderEvaluasi();renderPenilaian();renderRubrik();renderLogoPreview();
}

// ============ EXPORT CSV ============
document.getElementById('btn-export-csv').addEventListener('click',()=>{
  let rows = [];
  const examEvalsCsv = state.evaluasi.filter(e=>e.examType);
  rows.push(['NILAI MAHASISWA PER SUB-CPMK']);
  rows.push(['NIM','Nama', ...state.subCpmk.map((s,si)=>'Sub'+(si+1)), ...examEvalsCsv.map(ev=>ev.examType), 'Nilai Akhir','Huruf Mutu']);
  state.mahasiswa.forEach(s=>{
    const fs = studentFinalScore(s);
    rows.push([s.nim, s.nama, ...state.subCpmk.map(sub=>s.nilai[sub.id]||''), ...examEvalsCsv.map(ev=>s.nilai[ev.id]||''), Math.round(fs*10)/10, hurufMutuFor(fs)]);
  });
  rows.push([]);
  rows.push(['KETERCAPAIAN CPL PER MAHASISWA']);
  rows.push(['NIM','Nama', ...state.cplSelected]);
  state.mahasiswa.forEach(s=>{
    rows.push([s.nim, s.nama, ...state.cplSelected.map(k=>{const avg=studentCplScore(s,k);return avg===null?'':Math.round(avg*10)/10;})]);
  });
  const csv = rows.map(r=>r.map(cell=>'"'+String(cell).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='Rekap-Penilaian-OBE.csv'; a.click(); URL.revokeObjectURL(url);
});

// ============ EXPORT DOC ============
document.getElementById('btn-export-doc').addEventListener('click',()=>{
  const id = state.identitas;
  const SH='font-size:11.5pt;font-weight:bold;margin:16pt 0 4pt;background:#16324F;color:#ffffff;padding:5pt 8pt;';
  const NB='border:none;padding:2pt 6pt;';
  // Template-matching style constants
  const BORDER='1px solid #000000';
  const TBL=`border-collapse:collapse;width:100%;margin-bottom:0;`;
  const TD=`border:${BORDER};padding:4pt 6pt;font-size:10pt;vertical-align:middle;`;
  const TDH=`border:${BORDER};padding:4pt 6pt;font-size:10pt;font-weight:bold;vertical-align:middle;`;
  const GRAY='background:#D9D9D9;';
  const LBLUE='background:#C6D9F1;';
  const ORANGE='background:#FABF8F;';

  // ---------- CPL-Prodi & CP-MK rows (inti template) ----------
  const cplRowsCore = state.cplSelected.map(k=>{
    const c = CPL_BANK.find(x=>x.kode===k);
    return `<tr><td style="${TD}width:55px;text-align:center;"><b>${k}</b></td><td style="${TD}">${escapeHtml(c?c.deskripsi:'')}</td></tr>`;
  }).join('') || `<tr><td style="${TD}" colspan="2">(belum diisi)</td></tr>`;
  const cplRowCount = state.cplSelected.length || 1;

  const cpmkRowsCore = state.cpmk.map((m,mi)=>`<tr><td style="${TD}width:55px;text-align:center;"><b>CPMK${mi+1}</b></td><td style="${TD}">${escapeHtml(m.deskripsi)} (${escapeHtml(m.bloomLevel||'')})</td></tr>`).join('') || `<tr><td style="${TD}" colspan="2">(belum diisi)</td></tr>`;
  const cpmkRowCount = state.cpmk.length || 1;

  // ---------- Korelasi CPMK x Sub-CPMK matrix (gaya template) ----------
  let korelasiHtml = `<p style="font-size:9pt;font-style:italic;">(belum diisi)</p>`;
  if(state.cpmk.length && state.subCpmk.length){
    korelasiHtml = `<table style="${TBL}"><tr><th style="${TDH}${LBLUE}">CPMK \\ Sub-CPMK</th>`+
      state.subCpmk.map((s,si)=>`<th style="${TDH}${LBLUE}text-align:center;font-size:8pt;">Sub${si+1}</th>`).join('')+
      `</tr>`+
      state.cpmk.map((m,mi)=>`<tr><td style="${TDH}">CPMK${mi+1}</td>`+
        state.subCpmk.map(s=>`<td style="${TD}text-align:center;">${s.cpmkId===m.id?'v':''}</td>`).join('')+
      `</tr>`).join('')+
      `</table>`;
  }

  // ---------- Rencana Pembelajaran Mingguan (kolom sesuai template: Indikator/Kriteria/Bobot; Jenis dilipat ke kolom Bobot) ----------
  const weekRowsCore = state.weeks.map((w,wIdx)=>{
    const subIdx = state.subCpmk.findIndex(s=>s.id===w.subCpmkId);
    const subLabel = subIdx>=0 ? 'Sub'+(subIdx+1)+': '+escapeHtml(state.subCpmk[subIdx].deskripsi) : '-';
    if(w.minggu===8 || w.minggu===16){
      const type = w.minggu===8 ? 'UTS' : 'UAS';
      const examEv = state.evaluasi.find(e=>e.id===examEvalId(type));
      const covered = coveredSubCpmkIds(type);
      const coveredLabel = subLabelList(covered).join(', ') || '-';
      const jenisTxtX = examEv ? escapeHtml(examEv.jenisEvaluasi) : '-';
      const bobotTxtX = examEv ? (Math.round((parseFloat(examEv.bobot)||0)*10)/10+'%') : '-';
      const titleX = type==='UTS' ? 'Evaluasi Tengah Semester (UTS)' : 'Evaluasi Akhir Semester (UAS)';
      return `<tr>
        <td style="${TD}text-align:center;">${w.minggu}</td>
        <td colspan="5" style="${TD}${ORANGE}text-align:center;"><b>${titleX}</b> — Mencakup ${coveredLabel}</td>
        <td style="${TD}font-size:8.5pt;">${examEv?escapeHtml(genIndikatorExam(type,covered)):'-'}</td>
        <td style="${TD}font-size:8.5pt;">${examEv?escapeHtml(genKriteria(examEv)):'-'}</td>
        <td style="${TD}text-align:center;font-size:8.5pt;">${jenisTxtX} (${bobotTxtX})</td>
      </tr>`;
    }
    const ev = w.subCpmkId ? state.evaluasi.find(e=>e.subCpmkId===w.subCpmkId) : null;
    const isLastMeeting = w.subCpmkId ? (lastWeekIdxForSub(w.subCpmkId)===wIdx) : false;
    const jenisTxt = ev ? escapeHtml(ev.jenisEvaluasi) : '-';
    const bobotCellTxt = ev ? (isLastMeeting ? (jenisTxt+' ('+(Math.round((parseFloat(ev.bobot)||0)*10)/10)+'%)') : (jenisTxt+' (lanjutan)')) : '-';
    return `<tr>
      <td style="${TD}text-align:center;">${w.minggu}</td>
      <td style="${TD}font-size:8.5pt;">${subLabel}</td>
      <td style="${TD}font-size:8.5pt;">${escapeHtml(w.materi)}</td>
      <td style="${TD}font-size:8.5pt;">${escapeHtml(w.bentuk)}</td>
      <td style="${TD}font-size:8.5pt;">${escapeHtml(w.metode)}</td>
      <td style="${TD}font-size:8.5pt;">${escapeHtml(w.pengalaman)}</td>
      <td style="${TD}font-size:8.5pt;">${escapeHtml(w.indikator)}</td>
      <td style="${TD}font-size:8.5pt;">${escapeHtml(w.kriteria)}</td>
      <td style="${TD}text-align:center;font-size:8.5pt;">${bobotCellTxt}</td>
    </tr>`;
  }).join('');

  // ---------- Catatan (persis 15 poin baku institusi) ----------
  const catatanHtml = `
    <ol style="font-size:9.5pt;">
      <li>Satu sks pada proses pembelajaran berupa kuliah, responsi, atau tutorial, terdiri atas:
        <ol type="a"><li>Kegiatan tatap muka 50 menit per minggu per semester;</li><li>Kegiatan penugasan terstruktur 60 menit per minggu per semester;</li><li>Kegiatan mandiri 60 menit per minggu per semester.</li></ol></li>
      <li>Satu sks pada proses pembelajaran berupa seminar atau bentuk lain yang sejenis, terdiri atas:
        <ol type="a"><li>Kegiatan tatap muka 100 menit per minggu per semester;</li><li>Kegiatan mandiri 70 menit per minggu per semester.</li></ol></li>
      <li>Satu sks pada proses pembelajaran berupa praktikum, praktik studio, praktik lapangan, penelitian, pengabdian kepada masyarakat atau proses pembelajaran yang sejenis 170 menit per minggu per semester.</li>
      <li>Capaian Pembelajaran Lulusan PRODI (CPL-PRODI) adalah kemampuan yang dimiliki oleh setiap lulusan PRODI yang merupakan internalisasi dari sikap, penguasaan pengetahuan dan ketrampilan sesuai dengan jenjang prodinya yang diperoleh melalui proses pembelajaran.</li>
      <li>CPL yang dibebankan pada mata kuliah adalah beberapa capaian pembelajaran lulusan program studi (CPL-PRODI) yang digunakan untuk pembentukan/pengembangan sebuah mata kuliah yang terdiri dari aspek sikap, ketrampilan umum, ketrampilan khusus dan pengetahuan.</li>
      <li>CP Mata kuliah (CPMK) adalah kemampuan yang dijabarkan secara spesifik dari CPL yang dibebankan pada mata kuliah, dan bersifat spesifik terhadap bahan kajian atau materi pembelajaran mata kuliah tersebut.</li>
      <li>Sub-CP Mata kuliah (Sub-CPMK) adalah kemampuan yang dijabarkan secara spesifik dari CPMK yang dapat diukur atau diamati dan merupakan kemampuan akhir yang direncanakan pada tiap tahap pembelajaran, dan bersifat spesifik terhadap materi pembelajaran mata kuliah tersebut.</li>
      <li>Indikator penilaian kemampuan dalam proses maupun hasil belajar mahasiswa adalah pernyataan spesifik dan terukur yang mengidentifikasi kemampuan atau kinerja hasil belajar mahasiswa yang disertai bukti-bukti.</li>
      <li>Kreteria Penilaian adalah patokan yang digunakan sebagai ukuran atau tolok ukur ketercapaian pembelajaran dalam penilaian berdasarkan indikator-indikator yang telah ditetapkan. Kreteria penilaian merupakan pedoman bagi penilai agar penilaian konsisten dan tidak bias. Kreteria dapat berupa kuantitatif ataupun kualitatif.</li>
      <li>Bentuk penilaian: tes dan non-tes.</li>
      <li>Bentuk pembelajaran: Kuliah, Responsi, Tutorial, Seminar atau yang setara, Praktikum, Praktik Studio, Praktik Bengkel, Praktik Lapangan, Penelitian, Pengabdian Kepada Masyarakat dan/atau bentuk pembelajaran lain yang setara.</li>
      <li>Metode Pembelajaran: Small Group Discussion, Role-Play &amp; Simulation, Discovery Learning, Self-Directed Learning, Cooperative Learning, Collaborative Learning, Contextual Learning, Project Based Learning, dan metode lainnya yang setara.</li>
      <li>Materi Pembelajaran adalah rincian atau uraian dari bahan kajian yang dapat disajikan dalam bentuk beberapa pokok dan sub-pokok bahasan.</li>
      <li>Bobot penilaian adalah prosentasi penilaian terhadap setiap pencapaian sub-CPMK yang besarnya proposional dengan tingkat kesulitan pencapaian sub-CPMK tsb., dan totalnya 100%.</li>
      <li>TM=Tatap Muka, TS=Tugas Terstruktur, TM=Tugas Mandiri</li>
    </ol>`;

  // ---------- Lampiran tambahan (di luar format standar template, tetap disertakan) ----------
  const subRowsExtra = state.subCpmk.map((s,si)=>{
    const pIdx = state.cpmk.findIndex(m=>m.id===s.cpmkId);
    return `<tr><td style="width:70px;${NB}"><b>Sub${si+1}</b></td><td style="${NB}">${escapeHtml(s.deskripsi)} (${escapeHtml(s.bloomLevel||'')})<br><i>Dari: ${pIdx>=0?'CPMK'+(pIdx+1):'-'}</i></td></tr>`;
  }).join('');
  const bkRowsExtra = state.bkAssigned.map(k=>`<tr><td style="width:60px;${NB}"><b>${k}</b></td><td style="${NB}">${escapeHtml(BK_BANK[k]||'')}</td></tr>`).join('');
  const refRows = state.referensi.map(r=>`<li>${escapeHtml(r.teks)}</li>`).join('');
  const evalRowsExtra = state.subCpmk.map((s,si)=>{
    const ev = state.evaluasi.find(e=>e.subCpmkId===s.id);
    if(!ev) return '';
    return `<tr><td>Sub${si+1}</td><td>${escapeHtml((s.deskripsi||'').slice(0,60))}</td><td>${escapeHtml(ev.jenisEvaluasi)}</td><td style="text-align:center;">${escapeHtml(ev.bobot)}</td><td>${escapeHtml(ev.deskripsi)}</td></tr>`;
  }).join('') + ['UTS','UAS'].map(type=>{
    const ev = state.evaluasi.find(e=>e.id===examEvalId(type));
    if(!ev) return '';
    const covered = coveredSubCpmkIds(type);
    const label = type + ' (Pertemuan '+(type==='UTS'?8:16)+')';
    return `<tr><td>${type}</td><td>Mencakup ${escapeHtml(subLabelList(covered).join(', ')||'-')}</td><td>${escapeHtml(ev.jenisEvaluasi)}</td><td style="text-align:center;">${escapeHtml(ev.bobot)}</td><td>${escapeHtml(ev.deskripsi)}</td></tr>`;
  }).join('');
  const totalEval = evaluasiTotalBobot();
  const gradingRows = state.gradingScale.map(g=>`<tr><td style="text-align:center;">${escapeHtml(g.hm)}</td><td>${escapeHtml(g.sm)}</td><td style="text-align:center;">${g.min} - ${g.max}</td><td style="text-align:center;">${g.am}</td></tr>`).join('');
  const rubrikRows = state.rubrik.map(r=>{
    const aspekList = r.aspects.map(a=>{
      const d = a.deskriptor || {};
      const skala = [5,4,3,2,1].map(lv=>`${lv}=${escapeHtml((d[lv]||'').slice(0,60))}${(d[lv]||'').length>60?'…':''}`).join('; ');
      return `<b>${escapeHtml(a.nama)} (${a.bobot}%)</b><br><span style="font-size:7.5pt;">${skala}</span>`;
    }).join('<br><br>');
    return `<tr><td>${escapeHtml(r.nama)}</td><td>${aspekList}</td></tr>`;
  }).join('');

  // ---------- Kop / Banner (gaya template: biru, logo, 3 baris judul) ----------
  const logoCell = id.logoDataUrl
    ? `<img src="${id.logoDataUrl}" style="width:60pt;height:60pt;object-fit:contain;">`
    : '';
  const fakultasLine = id.fakultas ? `<p style="margin:0;font-size:9pt;font-weight:normal;">${escapeHtml(id.fakultas)}</p>` : '';
  const bannerHtml = `
    <table style="${TBL}margin-bottom:0;">
      <tr>
        <td style="border:${BORDER};background:#00B0F0;width:70pt;text-align:center;padding:6pt;">${logoCell}</td>
        <td style="border:${BORDER};background:#00B0F0;color:#ffffff;text-align:center;padding:8pt;">
          <p style="margin:0;font-size:14pt;font-weight:bold;">RENCANA PEMBELAJARAN SEMESTER</p>
          <p style="margin:0;font-size:11.5pt;font-weight:bold;">PROGRAM STUDI ${escapeHtml((id.prodi||'').toUpperCase())}</p>
          <p style="margin:0;font-size:11.5pt;font-weight:bold;">${escapeHtml((id.universitas||'').toUpperCase())}</p>
          ${fakultasLine}
        </td>
      </tr>
    </table>`;

  // ---------- Tabel identitas MK ----------
  const identTable = `
    <table style="${TBL}margin-top:0;margin-bottom:0;">
      <tr>
        <th style="${TDH}text-align:center;">MATA KULIAH</th>
        <th style="${TDH}text-align:center;">KODE MK</th>
        <th style="${TDH}text-align:center;">BOBOT (SKS)</th>
        <th style="${TDH}text-align:center;">SEMESTER</th>
        <th style="${TDH}text-align:center;">TGL. REVISI</th>
      </tr>
      <tr>
        <td style="${TD}">${escapeHtml(id.namaMK)}</td>
        <td style="${TD}text-align:center;">${escapeHtml(id.kodeMK)}</td>
        <td style="${TD}text-align:center;">${escapeHtml(id.sks)}</td>
        <td style="${TD}text-align:center;">${escapeHtml(id.semester)}</td>
        <td style="${TD}text-align:center;">${escapeHtml(id.tglRevisi)}</td>
      </tr>
    </table>`;

  // ---------- Tabel otoritas ----------
  const otoritasTable = `
    <table style="${TBL}margin-top:0;margin-bottom:0;">
      <tr>
        <th style="${TDH}${GRAY}text-align:center;width:15%;">OTORITAS</th>
        <th style="${TDH}${GRAY}text-align:center;">DOSEN PENGEMBANG RPS</th>
        <th style="${TDH}${GRAY}text-align:center;">KOORDINATOR RUMPUN</th>
        <th style="${TDH}${GRAY}text-align:center;">KETUA PRODI</th>
      </tr>
      <tr>
        <td style="${TD}height:36pt;"></td>
        <td style="${TD}text-align:center;">${escapeHtml(id.dosenPengembangRPS)}</td>
        <td style="${TD}text-align:center;">${escapeHtml(id.koordinatorRumpun)}</td>
        <td style="${TD}text-align:center;">${escapeHtml(id.ketuaProdi)}</td>
      </tr>
    </table>`;

  // ---------- Blok Capaian Pembelajaran (satu tabel rowspan, meniru template persis) ----------
  const cpTotalRows = 1 + cplRowCount + 1 + cpmkRowCount + 2; // header CPL + baris CPL + header CP-MK + baris CPMK + header Korelasi + baris matrix
  const cpBlock = `
    <table style="${TBL}margin-top:0;margin-bottom:0;">
      <tr>
        <td style="${TDH}width:14%;vertical-align:top;" rowspan="${cpTotalRows}">Capaian Pembelajaran (CP)</td>
        <td colspan="2" style="${TDH}${LBLUE}">CPL-Prodi</td>
      </tr>
      ${cplRowsCore}
      <tr><td colspan="2" style="${TDH}${LBLUE}">CP-MK</td></tr>
      ${cpmkRowsCore}
      <tr><td colspan="2" style="${TDH}${LBLUE}">Korelasi CPMK dengan Sub-CPMK</td></tr>
      <tr><td colspan="2" style="${TD}padding:4pt;">${korelasiHtml}</td></tr>
    </table>`;

  // ---------- Deskripsi & data pendukung ----------
  const descTable = `
    <table style="${TBL}margin-top:0;margin-bottom:0;">
      <tr><td style="${TDH}width:18%;">Deskripsi Singkat</td><td style="${TD}">${escapeHtml(id.deskripsiSingkat)}</td></tr>
      <tr><td style="${TDH}">Pokok Bahasan</td><td style="${TD}">${escapeHtml(id.pokokBahasan)}</td></tr>
      <tr><td style="${TDH}">Referensi</td><td style="${TD}"><ol style="margin:0;padding-left:16pt;">${refRows || '<li>(belum diisi)</li>'}</ol></td></tr>
      <tr><td style="${TDH}">Media Pembelajaran</td><td style="${TD}">${escapeHtml(id.mediaPembelajaran)}</td></tr>
      <tr><td style="${TDH}">Team Teaching</td><td style="${TD}">${escapeHtml(id.teamTeaching)||'-'}</td></tr>
      <tr><td style="${TDH}">Mata Kuliah Syarat</td><td style="${TD}">${escapeHtml(id.prasyarat)||'-'}</td></tr>
    </table>`;

  // ---------- Rencana Pembelajaran Mingguan ----------
  const weekTable = `
    <table style="${TBL}margin-top:0;">
      <tr>
        <th style="${TDH}${LBLUE}text-align:center;" rowspan="2">Pert.</th>
        <th style="${TDH}${LBLUE}text-align:center;" rowspan="2">Sub-CPMK<br>(Sesuai tahapan Belajar)</th>
        <th style="${TDH}${LBLUE}text-align:center;" rowspan="2">Materi Pembelajaran</th>
        <th style="${TDH}${LBLUE}text-align:center;" rowspan="2">Bentuk Pembelajaran</th>
        <th style="${TDH}${LBLUE}text-align:center;" rowspan="2">Metode Pembelajaran</th>
        <th style="${TDH}${LBLUE}text-align:center;" rowspan="2">Pengalaman Belajar Mahasiswa</th>
        <th style="${TDH}${LBLUE}text-align:center;" colspan="3">Penilaian</th>
      </tr>
      <tr>
        <th style="${TDH}${LBLUE}text-align:center;">Indikator</th>
        <th style="${TDH}${LBLUE}text-align:center;">Kriteria</th>
        <th style="${TDH}${LBLUE}text-align:center;">Jenis (Bobot)</th>
      </tr>
      ${weekRowsCore}
    </table>
    <p style="font-size:8pt;font-style:italic;margin:4pt 0 0;">Kolom Jenis (Bobot) menampilkan jenis evaluasi dan bobotnya sekaligus; bobot ditampilkan pada pertemuan terakhir tiap Sub-CPMK agar totalnya 100% (pertemuan sebelumnya ditandai "lanjutan").</p>`;

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>RPS ${escapeHtml(id.namaMK)}</title>
  <style>
    @page { size: 21cm 29.7cm; margin: 1.5cm; }
    body{font-family:Calibri,Arial,sans-serif;font-size:10pt;color:#000000;}
    table{border-collapse:collapse;width:100%;}
    p{margin:0 0 4pt;}
  </style></head>
  <body>
    ${bannerHtml}
    ${identTable}
    ${otoritasTable}
    ${cpBlock}
    ${descTable}

    <div style="${SH}margin-top:14pt;">Rencana Pembelajaran Mingguan</div>
    ${weekTable}

    <div style="${SH}">Catatan</div>
    ${catatanHtml}

    <div style="page-break-before:always;${SH}background:#16324F;">Lampiran Tambahan (di luar format standar institusi)</div>
    <p style="font-size:9pt;font-style:italic;">Bagian di bawah ini bukan bagian dari format RPS baku, namun tetap disertakan sebagai rincian pendukung dari data yang telah diisi di aplikasi.</p>

    <div style="${SH}">Bahan Kajian Mata Kuliah</div>
    <table><tr><th>Kode</th><th>Bahan Kajian</th></tr>${bkRowsExtra || '<tr><td colspan="2">(belum diisi)</td></tr>'}</table>

    <div style="${SH}">Rincian Sub-CPMK</div>
    <table><tr><th>Kode</th><th>Deskripsi</th></tr>${subRowsExtra || '<tr><td colspan="2">(belum diisi)</td></tr>'}</table>

    <div style="${SH}">Rencana Evaluasi (per Sub-CPMK)</div>
    <table><tr><th>Sub-CPMK</th><th>Ringkasan</th><th>Jenis evaluasi</th><th>Bobot %</th><th>Keterangan</th></tr>${evalRowsExtra || '<tr><td colspan="5">(belum diisi)</td></tr>'}
    <tr><td colspan="3" style="text-align:right;"><b>Jumlah</b></td><td style="text-align:center;"><b>${Math.round(totalEval*10)/10}</b></td><td></td></tr></table>

    <div style="${SH}">Kriteria Penilaian (Huruf Mutu)</div>
    <table><tr><th>Huruf mutu</th><th>Sebutan</th><th>Rentang nilai</th><th>Angka mutu</th></tr>${gradingRows}</table>

    <div style="${SH}">Rubrik Penilaian</div>
    <table><tr><th>Rubrik</th><th>Aspek (bobot)</th></tr>${rubrikRows || '<tr><td colspan="2">(belum diisi)</td></tr>'}</table>
  </body>
  </html>`;

  const blob = new Blob(['\ufeff'+html],{type:'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const nama = (id.kodeMK || 'draft').replace(/[^a-z0-9\-]/gi,'_');
  a.href=url; a.download='RPS-'+nama+'.doc'; a.click(); URL.revokeObjectURL(url);
});

// ============ INIT ============
populateMkPicker();
renderCplDisplay();
renderBkDisplay();
renderCpmk();
renderSubCpmk();
renderReferensi();
renderWeeks();
renderEvaluasi();
renderGradingScale();
renderRubrik();
renderLogoPreview();

