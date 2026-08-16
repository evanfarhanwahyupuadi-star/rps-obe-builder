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
  renderCplDisplay();renderBkDisplay();renderCpmk();renderSubCpmk();renderReferensi();renderWeeks();renderEvaluasi();renderPenilaian();renderRubrik();
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

  const cplRows = state.cplSelected.map(k=>{
    const c = CPL_BANK.find(x=>x.kode===k);
    return `<tr><td style="width:60px;${NB}"><b>${k}</b></td><td style="${NB}">${escapeHtml(c?c.deskripsi:'')}</td></tr>`;
  }).join('');
  const bkRowsDoc = state.bkAssigned.map(k=>`<tr><td style="width:60px;${NB}"><b>${k}</b></td><td style="${NB}">${escapeHtml(BK_BANK[k]||'')}</td></tr>`).join('');
  const cpmkRows = state.cpmk.map((m,mi)=>`<tr><td style="width:70px;${NB}"><b>CPMK${mi+1}</b></td><td style="${NB}">${escapeHtml(m.deskripsi)} (${m.bloomLevel})<br><i>Terkait: ${m.cplKodes.join(', ')||'-'}</i></td></tr>`).join('');
  const subRows = state.subCpmk.map((s,si)=>{
    const pIdx = state.cpmk.findIndex(m=>m.id===s.cpmkId);
    return `<tr><td style="width:70px;${NB}"><b>Sub${si+1}</b></td><td style="${NB}">${escapeHtml(s.deskripsi)} (${s.bloomLevel||''})<br><i>Dari: ${pIdx>=0?'CPMK'+(pIdx+1):'-'}</i></td></tr>`;
  }).join('');

  let korelasiHtml = '<p><i>(belum diisi)</i></p>';
  if(state.cpmk.length && state.subCpmk.length){
    korelasiHtml = '<table><tr><th>CPMK \\ Sub-CPMK</th>'+state.subCpmk.map((s,si)=>`<th>Sub${si+1}</th>`).join('')+'</tr>'+
      state.cpmk.map((m,mi)=>'<tr><td><b>CPMK'+(mi+1)+'</b></td>'+state.subCpmk.map(s=>`<td style="text-align:center;">${s.cpmkId===m.id?'v':''}</td>`).join('')+'</tr>').join('')+
      '</table>';
  }

  const weekRows = state.weeks.map((w,wIdx)=>{
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
        <td style="text-align:center;">${w.minggu}</td><td>${coveredLabel}</td>
        <td colspan="4" style="text-align:center;"><b>${titleX}</b></td>
        <td>${examEv?escapeHtml(genIndikatorExam(type,covered)):'-'}</td>
        <td>${examEv?escapeHtml(genKriteria(examEv)):'-'}</td>
        <td style="text-align:center;">${jenisTxtX}</td><td style="text-align:center;">${bobotTxtX}</td>
      </tr>`;
    }
    const ev = w.subCpmkId ? state.evaluasi.find(e=>e.subCpmkId===w.subCpmkId) : null;
    const isLastMeeting = w.subCpmkId ? (lastWeekIdxForSub(w.subCpmkId)===wIdx) : false;
    const jenisTxt = ev ? escapeHtml(ev.jenisEvaluasi) : '-';
    const bobotTxt = ev ? (isLastMeeting ? (Math.round((parseFloat(ev.bobot)||0)*10)/10+'%') : '(lanjutan)') : '-';
    return `<tr>
      <td style="text-align:center;">${w.minggu}</td><td>${subLabel}</td><td>${escapeHtml(w.materi)}</td>
      <td>${escapeHtml(w.bentuk)}</td><td>${escapeHtml(w.metode)}</td><td>${escapeHtml(w.pengalaman)}</td>
      <td>${escapeHtml(w.indikator)}</td><td>${escapeHtml(w.kriteria)}</td>
      <td style="text-align:center;">${jenisTxt}</td><td style="text-align:center;">${bobotTxt}</td>
    </tr>`;
  }).join('');

  const refRows = state.referensi.map(r=>`<li>${escapeHtml(r.teks)}</li>`).join('');

  const evalRows = state.subCpmk.map((s,si)=>{
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

  const catatan = [
    'Capaian Pembelajaran Lulusan PRODI (CPL-PRODI) adalah kemampuan yang dimiliki oleh setiap lulusan PRODI yang merupakan internalisasi dari sikap, penguasaan pengetahuan dan ketrampilan sesuai dengan jenjang prodinya yang diperoleh melalui proses pembelajaran.',
    'CPL yang dibebankan pada mata kuliah adalah beberapa capaian pembelajaran lulusan program studi (CPL-PRODI) yang digunakan untuk pembentukan/pengembangan sebuah mata kuliah.',
    'CP Mata kuliah (CPMK) adalah kemampuan yang dijabarkan secara spesifik dari CPL yang dibebankan pada mata kuliah, dan bersifat spesifik terhadap bahan kajian atau materi pembelajaran mata kuliah tersebut.',
    'Sub-CP Mata kuliah (Sub-CPMK) adalah kemampuan yang dijabarkan secara spesifik dari CPMK yang dapat diukur atau diamati dan merupakan kemampuan akhir yang direncanakan pada tiap tahap pembelajaran.',
    'Bobot penilaian ditetapkan pada level Sub-CPMK (bukan per pertemuan mingguan), karena satu Sub-CPMK dapat dibahas dalam lebih dari satu pertemuan, dan totalnya harus 100%.',
    'Jenis evaluasi disarankan mengikuti kesesuaian level kognitif (Taksonomi Bloom) pada Sub-CPMK terkait: level mengingat/memahami (C1-C2) sesuai untuk Kuis; level menerapkan (C3) sesuai untuk Tugas Latihan/Penerapan; level menganalisis-mengevaluasi-mencipta (C4-C6) sesuai untuk Studi Kasus, Presentasi & Diskusi Kritis, atau Proyek/Karya Tulis — merujuk pada prinsip Constructive Alignment dalam kurikulum OBE.',
    'Rubrik penilaian disusun otomatis mengikuti jenis evaluasi yang dipilih, dan dapat disesuaikan oleh dosen pengampu. Setiap aspek rubrik memiliki deskriptor kriteria pada skala 1-5 (kriteria-referensi), dan skor per mahasiswa pada rubrik inilah yang menjadi satu-satunya sumber nilai Sub-CPMK pada Rekap Penilaian.',
    'Bentuk pembelajaran: Kuliah, Responsi, Tutorial, Seminar atau yang setara, Praktikum, Praktik Studio, Praktik Bengkel, Praktik Lapangan, Penelitian, Pengabdian Kepada Masyarakat dan/atau bentuk pembelajaran lain yang setara.',
    'Metode Pembelajaran: Small Group Discussion, Role-Play & Simulation, Discovery Learning, Self-Directed Learning, Cooperative Learning, Collaborative Learning, Contextual Learning, Project Based Learning, dan metode lainnya yang setara.'
  ].map((t,i)=>`<tr><td style="width:24px;${NB}">${i+1}</td><td style="${NB}">${t}</td></tr>`).join('');

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>RPS ${escapeHtml(id.namaMK)}</title>
  <style>
    body{font-family:Calibri,Arial,sans-serif;font-size:11pt;}
    h1{font-size:15pt;text-align:center;margin-bottom:2pt;}
    h2{font-size:12pt;text-align:center;margin-top:2pt;}
    h3{font-size:10.5pt;text-align:center;margin-top:2pt;font-weight:normal;}
    table{border-collapse:collapse;width:100%;margin-bottom:14pt;}
    td,th{border:1px solid #333;padding:5pt 7pt;font-size:9pt;vertical-align:top;}
    th{background:#DCE6F1;font-weight:bold;}
  </style></head>
  <body>
    <div style="text-align:center;">
      <h3>${escapeHtml(id.universitas)}</h3>
      <h3>${escapeHtml((id.fakultas||'').toUpperCase())}</h3>
      <h3>PROGRAM STUDI ${escapeHtml((id.prodi||'').toUpperCase())}</h3>
      <h1>RENCANA PEMBELAJARAN SEMESTER</h1>
    </div>
    <table>
      <tr><th>Mata Kuliah</th><th>Kode MK</th><th>Bobot (SKS)</th><th>Semester</th><th>Tgl Revisi</th></tr>
      <tr><td>${escapeHtml(id.namaMK)}</td><td>${escapeHtml(id.kodeMK)}</td><td style="text-align:center;">${escapeHtml(id.sks)}</td><td style="text-align:center;">${escapeHtml(id.semester)}</td><td style="text-align:center;">${escapeHtml(id.tglRevisi)}</td></tr>
    </table>
    <table>
      <tr><th colspan="3">OTORITAS</th></tr>
      <tr><td style="width:33%;">Dosen Pengembang RPS</td><td style="width:33%;">Koordinator Rumpun</td><td style="width:33%;">Ketua Prodi</td></tr>
      <tr><td style="height:50pt;">${escapeHtml(id.dosenPengembangRPS)}</td><td>${escapeHtml(id.koordinatorRumpun)}</td><td>${escapeHtml(id.ketuaProdi)}</td></tr>
    </table>

    <div style="${SH}">Capaian Pembelajaran (CP) — CPL-Prodi</div>
    <p class="hint"><i>Ditetapkan otomatis oleh prodi berdasarkan mata kuliah yang dipilih.</i></p>
    <table><tr><th>Kode</th><th>Deskripsi</th></tr>${cplRows || '<tr><td colspan="2">(belum diisi)</td></tr>'}</table>

    <div style="${SH}">Bahan Kajian mata kuliah ini</div>
    <table><tr><th>Kode</th><th>Bahan Kajian</th></tr>${bkRowsDoc || '<tr><td colspan="2">(belum diisi)</td></tr>'}</table>

    <div style="${SH}">CP-MK</div>
    <table><tr><th>Kode</th><th>Deskripsi</th></tr>${cpmkRows || '<tr><td colspan="2">(belum diisi)</td></tr>'}</table>

    <div style="${SH}">Sub-CPMK</div>
    <table><tr><th>Kode</th><th>Deskripsi</th></tr>${subRows || '<tr><td colspan="2">(belum diisi)</td></tr>'}</table>

    <div style="${SH}">Korelasi CPMK dengan Sub-CPMK</div>
    ${korelasiHtml}

    <div style="${SH}">Deskripsi Singkat</div>
    <p>${escapeHtml(id.deskripsiSingkat)}</p>

    <div style="${SH}">Pokok Bahasan</div>
    <p>${escapeHtml(id.pokokBahasan)}</p>

    <div style="${SH}">Referensi</div>
    <ol>${refRows || '<li>(belum diisi)</li>'}</ol>

    <div style="${SH}">Media Pembelajaran</div>
    <p>${escapeHtml(id.mediaPembelajaran)}</p>

    <table><tr><td style="width:50%;${NB}"><b>Team Teaching</b>: ${escapeHtml(id.teamTeaching)}</td><td style="width:50%;${NB}"><b>Mata Kuliah Syarat</b>: ${escapeHtml(id.prasyarat)}</td></tr></table>

    <div style="${SH}">Rencana Evaluasi (per Sub-CPMK)</div>
    <table><tr><th>Sub-CPMK</th><th>Ringkasan</th><th>Jenis evaluasi</th><th>Bobot %</th><th>Keterangan</th></tr>${evalRows || '<tr><td colspan="5">(belum diisi)</td></tr>'}
    <tr><td colspan="3" style="text-align:right;"><b>Jumlah</b></td><td style="text-align:center;"><b>${Math.round(totalEval*10)/10}</b></td><td></td></tr></table>

    <div style="${SH}">Kriteria Penilaian</div>
    <table><tr><th>Huruf mutu</th><th>Sebutan</th><th>Rentang nilai</th><th>Angka mutu</th></tr>${gradingRows}</table>

    <div style="${SH}">Rencana Pembelajaran Mingguan</div>
    <table style="font-size:8pt;">
      <tr><th>Pert</th><th>Sub-CPMK</th><th>Materi</th><th>Bentuk</th><th>Metode</th><th>Pengalaman Belajar</th><th colspan="4">Penilaian</th></tr>
      <tr><th></th><th></th><th></th><th></th><th></th><th></th><th>Indikator</th><th>Kriteria</th><th>Jenis</th><th>Bobot</th></tr>
      ${weekRows}
    </table>
    <p style="font-size:8pt;"><i>Bobot ditampilkan pada pertemuan terakhir tiap Sub-CPMK (mengikuti tab Rencana Evaluasi) agar total 100%; pertemuan sebelumnya dari Sub-CPMK yang sama ditandai "(lanjutan)".</i></p>

    <div style="${SH}">Lampiran: Rubrik Penilaian</div>
    <table><tr><th>Rubrik</th><th>Aspek (bobot)</th></tr>${rubrikRows || '<tr><td colspan="2">(belum diisi)</td></tr>'}</table>

    <div style="${SH}">Catatan</div>
    <table>${catatan}</table>
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

