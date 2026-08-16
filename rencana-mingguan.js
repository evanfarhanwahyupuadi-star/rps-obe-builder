/*!
 * RPS OBE Builder - Tab: Rencana Mingguan & Rencana Evaluasi
 * Weekly plan table, auto-generated evaluation plan, auto bobot calculation.
 * Depends on: vendor/xlsx.full.min.js, and files loaded before this one
 *   (see index.html for the required <script> order).
 */
// ============ WEEKS (jadwal + kolom Penilaian: indikator, kriteria, jenis, bobot) ============
function lastWeekIdxForSub(subCpmkId){
  let last=-1;
  state.weeks.forEach((w,i)=>{ if(w.subCpmkId===subCpmkId) last=i; });
  return last;
}
// posisi pertemuan (mis. 2/3) untuk minggu ke-idx yang berbagi Sub-CPMK yang sama
function meetingPositionForSub(subCpmkId, idx){
  const idxs = [];
  state.weeks.forEach((w,i)=>{ if(w.subCpmkId===subCpmkId) idxs.push(i); });
  return { pos: idxs.indexOf(idx)+1, total: idxs.length };
}
function renderWeeks(){
  ensureExamEvaluasi();
  const tbody = document.getElementById('week-tbody');
  tbody.innerHTML='';
  state.weeks.forEach((w,idx)=>{
    const tr = document.createElement('tr');
    const badge = w.minggu===8 ? '<div class="week-badge uts">UTS</div>' : (w.minggu===16 ? '<div class="week-badge uas">UAS</div>' : '');
    if(w.minggu===8 || w.minggu===16){
      const type = w.minggu===8 ? 'UTS' : 'UAS';
      const ev = state.evaluasi.find(e=>e.id===examEvalId(type));
      const covered = coveredSubCpmkIds(type);
      w.subCpmkId = '';
      w.materi = genMateriExam(covered);
      w.bentuk = '—';
      w.metode = '—';
      w.pengalaman = genPengalamanExam(type, ev?ev.jenisEvaluasi:'Tes', covered);
      if(!w.indikator) w.indikator = genIndikatorExam(type, covered);
      if(!w.kriteria && ev) w.kriteria = genKriteria(ev);
      const subNums = subLabelList(covered);
      const subLabelHtml = subNums.length
        ? subNums.map(n=>`<span class="badge-mono" style="margin:1px;display:inline-block;">${n}</span>`).join('')
        : '<span class="hint">— belum ada Sub-CPMK</span>';
      const jenisCell2 = ev ? escapeHtml(ev.jenisEvaluasi) : '—';
      const bobotCell2 = ev ? (Math.round((parseFloat(ev.bobot)||0)*10)/10+'%') : '—';
      const disabledStyle = 'background:var(--paper-2);color:var(--muted);';
      tr.innerHTML = `
        <td class="minggu-cell">${w.minggu}${badge}</td>
        <td>${subLabelHtml}</td>
        <td><textarea disabled style="${disabledStyle}" title="Nonaktif — pertemuan evaluasi, mencakup seluruh Sub-CPMK terkait">${escapeHtml(w.materi)}</textarea></td>
        <td><input type="text" disabled value="—" style="${disabledStyle}text-align:center;" title="Tidak berlaku pada pertemuan evaluasi"></td>
        <td><input type="text" disabled value="—" style="${disabledStyle}text-align:center;" title="Tidak berlaku pada pertemuan evaluasi"></td>
        <td><textarea disabled style="${disabledStyle}" title="Nonaktif — pertemuan evaluasi">${escapeHtml(w.pengalaman)}</textarea></td>
        <td><textarea data-idx="${idx}" class="w-indikator" placeholder="Indikator">${escapeHtml(w.indikator)}</textarea></td>
        <td><input type="text" data-idx="${idx}" class="w-kriteria" value="${escapeHtml(w.kriteria)}" placeholder="Ketepatan..."></td>
        <td class="hint" style="text-align:center;" title="Pilih Tes/Tugas Proyek di tab Rencana Evaluasi">${jenisCell2}</td>
        <td style="text-align:center;font-weight:600;">${bobotCell2}</td>
        <td class="hint" style="text-align:center;" title="Baris evaluasi otomatis — tidak perlu autofill">—</td>
      `;
      tbody.appendChild(tr);
      return;
    }
    const subOptions = state.subCpmk.map((s,si)=>`<option value="${s.id}" ${w.subCpmkId===s.id?'selected':''}>Sub${si+1}</option>`).join('');
    const sub = w.subCpmkId ? state.subCpmk.find(s=>s.id===w.subCpmkId) : null;
    const ev = w.subCpmkId ? state.evaluasi.find(e=>e.subCpmkId===w.subCpmkId) : null;
    const jenisCell = ev ? escapeHtml(ev.jenisEvaluasi) : '—';
    const meetingPos = w.subCpmkId ? meetingPositionForSub(w.subCpmkId, idx) : null;
    const totalBobot = ev ? Math.round((parseFloat(ev.bobot)||0)*10)/10 : null;
    const bobotShare = ev ? Math.round((totalBobot/meetingPos.total)*10)/10 : null;
    const bobotCell = ev
      ? (meetingPos.total > 1
          ? `<span title="Dibagi rata: ${totalBobot}% ÷ ${meetingPos.total} pertemuan">${bobotShare}%</span>`
          : bobotShare+'%')
      : '—';

    // Bentuk pembelajaran: dropdown rekomendasi (mengikuti level Bloom Sub-CPMK) + opsi isi manual
    const bentukOpts = bentukOptionsFor(sub);
    const bentukIsManual = w.bentukManual || (w.bentuk && !bentukOpts.includes(w.bentuk));
    const bentukSelect = `<select data-idx="${idx}" class="w-bentuk-sel">` +
      bentukOpts.map((o,oi)=>`<option value="${escapeHtml(o)}" ${(!bentukIsManual && w.bentuk===o)?'selected':''}>${oi===0?'⚡ ':''}${escapeHtml(o)}</option>`).join('') +
      `<option value="__manual__" ${bentukIsManual?'selected':''}>✏️ Isi manual…</option></select>`;
    const bentukManualBox = bentukIsManual ? `<input type="text" data-idx="${idx}" class="w-bentuk-manual" value="${escapeHtml(w.bentuk)}" placeholder="Bentuk pembelajaran...">` : '';

    // Metode pembelajaran: dropdown rekomendasi + opsi isi manual (pola sama seperti Bentuk)
    const metodeOpts = metodeOptionsFor(sub);
    const metodeIsManual = w.metodeManual || (w.metode && !metodeOpts.includes(w.metode));
    const metodeSelect = `<select data-idx="${idx}" class="w-metode-sel">` +
      metodeOpts.map((o,oi)=>`<option value="${escapeHtml(o)}" ${(!metodeIsManual && w.metode===o)?'selected':''}>${oi===0?'⚡ ':''}${escapeHtml(o)}</option>`).join('') +
      `<option value="__manual__" ${metodeIsManual?'selected':''}>✏️ Isi manual…</option></select>`;
    const metodeManualBox = metodeIsManual ? `<input type="text" data-idx="${idx}" class="w-metode-manual" value="${escapeHtml(w.metode)}" placeholder="Metode pembelajaran...">` : '';

    tr.innerHTML = `
      <td class="minggu-cell">${w.minggu}${badge}</td>
      <td><select data-idx="${idx}" class="w-subcpmk"><option value="">—</option>${subOptions}</select></td>
      <td><textarea data-idx="${idx}" class="w-materi" placeholder="Materi/topik">${escapeHtml(w.materi)}</textarea></td>
      <td>${bentukSelect}${bentukManualBox}</td>
      <td>${metodeSelect}${metodeManualBox}</td>
      <td><textarea data-idx="${idx}" class="w-pengalaman" placeholder="Aktivitas mahasiswa">${escapeHtml(w.pengalaman)}</textarea></td>
      <td><textarea data-idx="${idx}" class="w-indikator" placeholder="Indikator">${escapeHtml(w.indikator)}</textarea></td>
      <td><input type="text" data-idx="${idx}" class="w-kriteria" value="${escapeHtml(w.kriteria)}" placeholder="Ketepatan..."></td>
      <td class="hint" style="text-align:center;" title="Diatur di tab Rencana Evaluasi">${jenisCell}</td>
      <td style="text-align:center;font-weight:600;" title="Bobot ditampilkan di pertemuan terakhir Sub-CPMK ini agar total tetap 100%">${bobotCell}</td>
      <td style="text-align:center;"><button class="btn-icon" data-idx="${idx}" data-action="autofill-week" title="Isi/segarkan otomatis dari rekomendasi Sub-CPMK terkait">⚡</button></td>
    `;
    tbody.appendChild(tr);
  });
  bindWeekInputs();
}
function bindWeekInputs(){
  const map = {'w-materi':'materi','w-pengalaman':'pengalaman','w-indikator':'indikator','w-kriteria':'kriteria'};
  Object.keys(map).forEach(cls=>{
    document.querySelectorAll('.'+cls).forEach(el=>{
      el.addEventListener('input',e=>{
        state.weeks[e.target.dataset.idx][map[cls]] = e.target.value;
      });
    });
  });
  // Kolom Bentuk: dropdown rekomendasi/preset atau beralih ke isian manual
  document.querySelectorAll('.w-bentuk-sel').forEach(el=>{
    el.addEventListener('change',e=>{
      const w = state.weeks[e.target.dataset.idx];
      if(e.target.value==='__manual__'){ w.bentukManual = true; }
      else { w.bentukManual = false; w.bentuk = e.target.value; }
      renderWeeks();
    });
  });
  document.querySelectorAll('.w-bentuk-manual').forEach(el=>{
    el.addEventListener('input',e=>{ state.weeks[e.target.dataset.idx].bentuk = e.target.value; });
  });
  // Kolom Metode: sama pola dengan Bentuk
  document.querySelectorAll('.w-metode-sel').forEach(el=>{
    el.addEventListener('change',e=>{
      const idx = e.target.dataset.idx;
      const w = state.weeks[idx];
      if(e.target.value==='__manual__'){ w.metodeManual = true; }
      else { w.metodeManual = false; w.metode = e.target.value; }
      // metode berubah -> segarkan Pengalaman Belajar bila belum diedit manual jadi tetap konsisten
      const sub = state.subCpmk.find(s=>s.id===w.subCpmkId);
      if(sub){
        const ev = state.evaluasi.find(ev=>ev.subCpmkId===sub.id);
        w.pengalaman = genPengalamanBelajar(sub, ev, w.metode);
      }
      renderWeeks();
    });
  });
  document.querySelectorAll('.w-metode-manual').forEach(el=>{
    el.addEventListener('input',e=>{ state.weeks[e.target.dataset.idx].metode = e.target.value; });
  });
  document.querySelectorAll('.w-subcpmk').forEach(el=>{
    el.addEventListener('change',e=>{
      const idx = e.target.dataset.idx;
      const w = state.weeks[idx];
      w.subCpmkId = e.target.value;
      const sub = state.subCpmk.find(s=>s.id===w.subCpmkId);
      if(sub){
        const ev = state.evaluasi.find(ev=>ev.subCpmkId===sub.id);
        // Materi, Bentuk & Metode terisi otomatis mengikuti rekomendasi Sub-CPMK (kecuali sudah diisi manual)
        if(sub.materi) w.materi = sub.materi;
        if(!w.bentukManual) w.bentuk = BENTUK_BY_BLOOM[sub.bloomLevel]||'Kuliah';
        if(!w.metodeManual) w.metode = METODE_BY_BLOOM[sub.bloomLevel]||'Ceramah, Tanya Jawab';
        // Pengalaman belajar, indikator & kriteria disusun otomatis (mencakup KKO, materi, metode & hasil)
        if(!w.pengalaman) w.pengalaman = genPengalamanBelajar(sub, ev, w.metode);
        if(!w.indikator) w.indikator = genIndikator(sub);
        if(!w.kriteria) w.kriteria = genKriteria(ev);
      }
      renderWeeks();
    });
  });
  document.querySelectorAll('[data-action=autofill-week]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const idx = e.target.dataset.idx;
      const w = state.weeks[idx];
      const sub = state.subCpmk.find(s=>s.id===w.subCpmkId);
      if(!sub){ alert('Kaitkan pertemuan ini ke Sub-CPMK terlebih dahulu.'); return; }
      const ev = state.evaluasi.find(e=>e.subCpmkId===sub.id);
      if(!w.materi) w.materi = sub.materi||'';
      if(!w.bentuk && !w.bentukManual) w.bentuk = BENTUK_BY_BLOOM[sub.bloomLevel]||'Kuliah';
      if(!w.metode && !w.metodeManual) w.metode = METODE_BY_BLOOM[sub.bloomLevel]||'Ceramah, Tanya Jawab';
      if(!w.pengalaman) w.pengalaman = genPengalamanBelajar(sub, ev, w.metode);
      if(!w.indikator) w.indikator = genIndikator(sub);
      if(!w.kriteria) w.kriteria = genKriteria(ev);
      renderWeeks();
    });
  });
}

// ============ RENCANA EVALUASI (1:1 otomatis dengan Sub-CPMK, jenis sesuai KKO) ============
function createEvaluasiForSubCpmk(sub){
  const jenis = JENIS_EVALUASI_BY_BLOOM[sub.bloomLevel] || 'Kuis';
  const evId = uid();
  state.evaluasi.push({id:evId, subCpmkId:sub.id, jenisEvaluasi:jenis, bobot:'', deskripsi:''});
  generateRubrikForEvaluasi(state.evaluasi.find(ev=>ev.id===evId), sub);
}
function generateRubrikForEvaluasi(ev, sub){
  const template = RUBRIK_TEMPLATES[ev.jenisEvaluasi] || RUBRIK_TEMPLATES['Kuis'];
  const subIdx = state.subCpmk.findIndex(s=>s.id===sub.id);
  const existing = state.rubrik.find(r=>r.linkedSubCpmkId===sub.id);
  // pertahankan bobot & deskriptor aspek lama jika nama aspek masih sama (dosen mungkin sudah menyesuaikan)
  const oldAspectByNama = {};
  if(existing) existing.aspects.forEach(a=>{ oldAspectByNama[a.nama]=a; });
  const newRubrik = {
    id: existing ? existing.id : uid(),
    nama: `${ev.jenisEvaluasi} — Sub${subIdx+1}`,
    aspects: template.map(t=>{
      const old = oldAspectByNama[t.nama];
      return old ? old : {id:uid(),nama:t.nama,bobot:t.bobot,deskriptor:genDeskriptorLevels(t.nama)};
    }),
    subjek: existing ? existing.subjek : [],
    skorByStudent: existing ? (existing.skorByStudent||{}) : {},
    linkedSubCpmkId: sub.id
  };
  if(existing){
    const i = state.rubrik.findIndex(r=>r.id===existing.id);
    state.rubrik[i] = newRubrik;
  } else {
    state.rubrik.push(newRubrik);
  }
}
function syncEvaluasiJenisForSub(subId){
  const sub = state.subCpmk.find(s=>s.id===subId);
  const ev = state.evaluasi.find(e=>e.subCpmkId===subId);
  if(!sub || !ev) return;
  ev.jenisEvaluasi = JENIS_EVALUASI_BY_BLOOM[sub.bloomLevel] || 'Kuis';
  generateRubrikForEvaluasi(ev, sub);
}
function evaluasiTotalBobot(){
  return state.evaluasi.reduce((s,ev)=>s+(parseFloat(ev.bobot)||0),0);
}
// ============ AUTO-HITUNG BOBOT (poin 2 revisi) ============
// bobot mentah per Sub-CPMK = jumlah pertemuan yang mencakup Sub-CPMK tsb x faktor kompleksitas jenis evaluasi
function autoHitungBobot(){
  if(state.evaluasi.length===0) return;
  const raw = state.evaluasi.map(ev=>{
    const factor = JENIS_COMPLEXITY_FACTOR[ev.jenisEvaluasi] || 1;
    if(ev.examType) return 1*factor; // UTS/UAS menempati tepat 1 pertemuan
    const meetingCount = Math.max(1, state.weeks.filter(w=>w.subCpmkId===ev.subCpmkId).length);
    return meetingCount*factor;
  });
  const rawSum = raw.reduce((a,b)=>a+b,0);
  if(rawSum===0) return;
  let running = 0;
  state.evaluasi.forEach((ev,i)=>{
    if(i < state.evaluasi.length-1){
      const v = Math.round((raw[i]/rawSum)*1000)/10; // 1 desimal
      ev.bobot = v;
      running += v;
    } else {
      // baris terakhir menampung sisa pembulatan agar total tepat 100
      ev.bobot = Math.round((100-running)*10)/10;
    }
  });
}
function renderEvaluasi(){
  const wrap = document.getElementById('evaluasi-list');
  wrap.innerHTML = '';
  if(state.subCpmk.length===0){
    wrap.innerHTML = '<p class="empty-hint">Rencana evaluasi mengikuti jumlah Sub-CPMK — tambahkan Sub-CPMK dulu di tab 2.</p>';
    document.getElementById('evaluasi-total').textContent='';
    return;
  }
  // sinkronkan: pastikan tiap Sub-CPMK punya 1 entri evaluasi (jaga-jaga jika data lama/loaded belum sinkron)
  state.subCpmk.forEach(s=>{
    if(!state.evaluasi.find(ev=>ev.subCpmkId===s.id)) createEvaluasiForSubCpmk(s);
  });
  ensureExamEvaluasi();
  const jenisOptions = JENIS_EVALUASI_OPTIONS.map(j=>`<option value="${j}">${j}</option>`).join('');
  state.subCpmk.forEach((s,si)=>{
    const ev = state.evaluasi.find(e=>e.subCpmkId===s.id);
    if(!ev) return;
    const div = document.createElement('div');
    div.className = 'row-item';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="flex:1;">
          <p class="hint" style="margin:0 0 8px;"><b style="color:var(--ink-2);">Sub${si+1}</b> — ${escapeHtml((s.deskripsi||'(belum diisi)').slice(0,90))}${(s.deskripsi||'').length>90?'…':''} <span class="badge-mono" style="margin-left:4px;">${s.bloomLevel||'C2'}</span></p>
          <div class="grid3">
            <div class="field" style="margin-bottom:0;">
              <label>Jenis evaluasi</label>
              <select data-evid="${ev.id}" class="ev-jenis">${jenisOptions}</select>
              <p class="hint">Saran otomatis dari level Bloom — bisa diganti.</p>
            </div>
            <div class="field" style="margin-bottom:0;">
              <label>Bobot (%)</label>
              <input type="number" data-evid="${ev.id}" class="ev-bobot" value="${ev.bobot}" placeholder="0">
            </div>
            <div class="field" style="margin-bottom:0;">
              <label>Keterangan</label>
              <input type="text" data-evid="${ev.id}" class="ev-desk" value="${escapeHtml(ev.deskripsi)}" placeholder="Opsional">
            </div>
          </div>
        </div>
      </div>`;
    wrap.appendChild(div);
    div.querySelector('.ev-jenis').value = ev.jenisEvaluasi;
  });
  wrap.querySelectorAll('.ev-jenis').forEach(sel=>sel.addEventListener('change',e=>{
    const ev = state.evaluasi.find(x=>x.id===e.target.dataset.evid);
    ev.jenisEvaluasi = e.target.value;
    const sub = state.subCpmk.find(s=>s.id===ev.subCpmkId);
    generateRubrikForEvaluasi(ev, sub);
    renderEvaluasi();renderRubrik();renderWeeks();
  }));
  wrap.querySelectorAll('.ev-bobot').forEach(inp=>inp.addEventListener('input',e=>{
    state.evaluasi.find(x=>x.id===e.target.dataset.evid).bobot = e.target.value;
    updateEvaluasiTotalBar();
    renderPenilaian();renderWeeks();
  }));
  wrap.querySelectorAll('.ev-desk').forEach(inp=>inp.addEventListener('input',e=>{
    state.evaluasi.find(x=>x.id===e.target.dataset.evid).deskripsi = e.target.value;
  }));

  // ============ UTS & UAS: evaluasi komprehensif lintas Sub-CPMK ============
  const examOptions = EXAM_JENIS_OPTIONS.map(j=>`<option value="${j}">${j}</option>`).join('');
  ['UTS','UAS'].forEach(type=>{
    const ev = state.evaluasi.find(e=>e.id===examEvalId(type));
    if(!ev) return;
    const covered = coveredSubCpmkIds(type);
    const coveredLabel = subLabelList(covered).join(', ') || '(belum ada Sub-CPMK pada rentang pertemuan ini)';
    const rangeLabel = type==='UTS' ? 'pertemuan 1–7' : 'pertemuan 9–15';
    const div = document.createElement('div');
    div.className = 'row-item';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="flex:1;">
          <p class="hint" style="margin:0 0 8px;"><b style="color:var(--ink-2);">${type} — Pertemuan ${type==='UTS'?8:16}</b> — mencakup ${escapeHtml(coveredLabel)} <span class="hint">(otomatis dari ${rangeLabel})</span></p>
          <div class="grid3">
            <div class="field" style="margin-bottom:0;">
              <label>Jenis evaluasi</label>
              <select data-evid="${ev.id}" class="ev-exam-jenis">${examOptions}</select>
              <p class="hint">Dipilih dosen — tes tertulis atau tugas proyek.</p>
            </div>
            <div class="field" style="margin-bottom:0;">
              <label>Bobot (%)</label>
              <input type="number" data-evid="${ev.id}" class="ev-exam-bobot" value="${ev.bobot}" placeholder="0">
            </div>
            <div class="field" style="margin-bottom:0;">
              <label>Keterangan</label>
              <input type="text" data-evid="${ev.id}" class="ev-exam-desk" value="${escapeHtml(ev.deskripsi)}" placeholder="Opsional">
            </div>
          </div>
        </div>
      </div>`;
    wrap.appendChild(div);
    div.querySelector('.ev-exam-jenis').value = ev.jenisEvaluasi;
  });
  wrap.querySelectorAll('.ev-exam-jenis').forEach(sel=>sel.addEventListener('change',e=>{
    const ev = state.evaluasi.find(x=>x.id===e.target.dataset.evid);
    ev.jenisEvaluasi = e.target.value;
    generateRubrikForExam(ev);
    renderEvaluasi();renderRubrik();renderWeeks();
  }));
  wrap.querySelectorAll('.ev-exam-bobot').forEach(inp=>inp.addEventListener('input',e=>{
    state.evaluasi.find(x=>x.id===e.target.dataset.evid).bobot = e.target.value;
    updateEvaluasiTotalBar();
    renderPenilaian();renderWeeks();
  }));
  wrap.querySelectorAll('.ev-exam-desk').forEach(inp=>inp.addEventListener('input',e=>{
    state.evaluasi.find(x=>x.id===e.target.dataset.evid).deskripsi = e.target.value;
  }));

  updateEvaluasiTotalBar();
}
document.getElementById('btn-auto-bobot').addEventListener('click',()=>{
  autoHitungBobot();
  renderEvaluasi();renderPenilaian();renderWeeks();
});
function updateEvaluasiTotalBar(){
  const bar = document.getElementById('evaluasi-total');
  if(!bar) return;
  const total = evaluasiTotalBobot();
  const rounded = Math.round(total*10)/10;
  if(Math.abs(total-100)<0.01){ bar.className='totals-bar ok'; bar.textContent='Total bobot: '+rounded+'% — sudah pas 100%'; }
  else { bar.className='totals-bar warn'; bar.textContent='Total bobot: '+rounded+'% — seharusnya berjumlah 100%'; }
}
