/*!
 * RPS OBE Builder - Tab: Identitas, CPL, CPMK & Sub-CPMK
 * Tab switching, mata kuliah picker, CPMK/Sub-CPMK generation, korelasi, referensi.
 * Depends on: vendor/xlsx.full.min.js, and files loaded before this one
 *   (see index.html for the required <script> order).
 */
// ============ TABS ============
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('section.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
    if(btn.dataset.tab==='penilaian') renderPenilaian();
    if(btn.dataset.tab==='evaluasi') renderEvaluasi();
  });
});

// ============ IDENTITAS: mata kuliah picker (auto CPL + BK) ============
function populateMkPicker(){
  const sel = document.getElementById('f-mkPicker');
  sel.innerHTML = '<option value="">— Pilih mata kuliah —</option>' +
    MATA_KULIAH_BANK.map((mk,idx)=>`<option value="${idx}">Sem ${mk.semester} — ${escapeHtml(mk.nama)} (${escapeHtml(mk.kode)}, ${mk.sks} sks)</option>`).join('');
}
document.getElementById('f-mkPicker').addEventListener('change',e=>{
  if(e.target.value===''){return;}
  const mk = MATA_KULIAH_BANK[e.target.value];
  state.identitas.kodeMK = mk.kode;
  state.identitas.namaMK = mk.nama;
  state.identitas.sks = mk.sks;
  state.identitas.semester = mk.semester;
  document.getElementById('f-kodeMK').value = mk.kode;
  document.getElementById('f-namaMK').value = mk.nama;
  document.getElementById('f-sks').value = mk.sks;
  document.getElementById('f-semester').value = mk.semester;

  state.cplSelected = [...mk.cpl];
  state.bkAssigned = [...mk.bk];
  state.cpmk = [];
  state.subCpmk = [];
  state.evaluasi = [];
  state.weeks.forEach(w=>{w.subCpmkId='';});
  renderCplDisplay();
  renderBkDisplay();
  renderCpmk();
  renderSubCpmk();
  renderWeeks();
  renderEvaluasi();
  renderRubrik();
});

const idFields = ['kodeMK','namaMK','sks','semester','tglRevisi','dosenPengembangRPS','koordinatorRumpun','ketuaProdi','teamTeaching','prasyarat','deskripsiSingkat','pokokBahasan','mediaPembelajaran'];
idFields.forEach(f=>{
  const el = document.getElementById('f-'+f);
  if(el) el.addEventListener('input',e=>{state.identitas[f]=e.target.value;});
});

// ============ CPL (read-only, otomatis dari MK) ============
function renderCplDisplay(){
  const wrap = document.getElementById('cpl-display-wrap');
  if(state.cplSelected.length===0){
    wrap.innerHTML = '<p class="empty-hint">Pilih mata kuliah di tab 1 terlebih dahulu — CPL akan terisi otomatis sesuai penetapan prodi.</p>';
    return;
  }
  wrap.innerHTML = state.cplSelected.map(kode=>{
    const c = CPL_BANK.find(x=>x.kode===kode);
    return `<div class="row-item" style="background:var(--paper-2);">
      <b style="font-family:'IBM Plex Mono',monospace;color:var(--ink-2);">${kode}</b>
      <span class="hint" style="text-transform:uppercase;font-size:10.5px;margin-left:8px;">${c?c.kategori:''}</span>
      <p style="margin:6px 0 0;font-size:13.5px;">${escapeHtml(c?c.deskripsi:'')}</p>
    </div>`;
  }).join('');
}

// ============ BAHAN KAJIAN (read-only, otomatis dari MK) ============
function renderBkDisplay(){
  const wrap = document.getElementById('bk-display-wrap');
  if(state.bkAssigned.length===0){
    wrap.innerHTML = '<p class="empty-hint">Pilih mata kuliah di tab 1 terlebih dahulu.</p>';
    return;
  }
  wrap.innerHTML = '<table class="rekap-table"><tr><th style="width:70px;">Kode</th><th>Bahan kajian</th></tr>' +
    state.bkAssigned.map(bkCode=>`<tr><td><span class="badge-mono" style="color:var(--ink-2);background:var(--paper-2);border-color:var(--line);">${bkCode}</span></td><td>${escapeHtml(BK_BANK[bkCode]||'')}</td></tr>`).join('') +
    '</table>';
}

// ============ CPMK: generate dari Bahan Kajian ============
document.getElementById('btn-generate-cpmk').addEventListener('click',()=>{
  if(state.bkAssigned.length===0){ alert('Pilih mata kuliah terlebih dahulu di tab 1.'); return; }
  state.bkAssigned.forEach((bkCode,i)=>{
    const bkText = BK_BANK[bkCode];
    const level = detectBloomLevel(bkText);
    const verb = kkoVerbFor(level, i);
    const text = `Mahasiswa mampu ${verb.toLowerCase()} ${lowerFirst(bkText)} dengan ${STANDAR_HARAPAN_BY_BLOOM[level]}.`;
    const suggested = suggestCplKodes(text + ' ' + bkText, state.cplSelected);
    state.cpmk.push({id:uid(), deskripsi:text, bloomLevel:level, bkSource:bkCode, cplKodes:suggested, cplNeedsReview:true});
  });
  renderCpmk();
});
document.getElementById('btn-add-cpmk').addEventListener('click',()=>{
  if(state.cplSelected.length===0){ alert('Pilih mata kuliah terlebih dahulu di tab 1.'); return; }
  state.cpmk.push({id:uid(),deskripsi:'',bloomLevel:'C2',bkSource:'',cplKodes:[...state.cplSelected],cplNeedsReview:true});
  renderCpmk();
});
function renderCpmk(){
  const wrap = document.getElementById('cpmk-list');
  wrap.innerHTML='';
  if(state.cplSelected.length===0){
    wrap.innerHTML = '<p class="empty-hint">Pilih mata kuliah di tab 1 terlebih dahulu.</p>';
    return;
  }
  if(state.cpmk.length===0){
    wrap.innerHTML = '<p class="empty-hint">Belum ada CPMK. Klik "Generate CPMK dari Bahan Kajian" di atas untuk draf otomatis, atau tambah manual.</p>';
  }
  const bloomOptions = Object.keys(KKO_BANK).map(lv=>`<option value="${lv}">${KKO_BANK[lv].label}</option>`).join('');
  state.cpmk.forEach((m,idx)=>{
    const div = document.createElement('div');
    div.className='row-item';
    const reviewBadge = m.cplNeedsReview
      ? '<span class="hint" style="background:#fff3cd;color:#8a6500;border:1px solid #f0d998;border-radius:4px;padding:1px 6px;margin-left:6px;text-transform:none;">⚠ perlu verifikasi CPL</span>'
      : '';
    const cplChecks = state.cplSelected.map(kode=>{
      const checked = m.cplKodes.includes(kode) ? 'checked' : '';
      return `<label style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0;font-weight:400;text-transform:none;">
        <input type="checkbox" class="cpmk-cpl-check" data-idx="${idx}" data-kode="${kode}" ${checked}> ${kode}
      </label>`;
    }).join('');
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="flex:1;">
          <div class="grid3" style="grid-template-columns:1fr 140px;">
            <div class="field" style="margin-bottom:6px;">
              <label>Deskripsi CPMK${m.bkSource?' <span class="hint" style="text-transform:none;">— dari '+m.bkSource+'</span>':''}${reviewBadge}</label>
              <textarea data-idx="${idx}" class="cpmk-desc" placeholder="Mahasiswa mampu ...">${escapeHtml(m.deskripsi)}</textarea>
            </div>
            <div class="field" style="margin-bottom:6px;">
              <label>Level Bloom</label>
              <select data-idx="${idx}" class="cpmk-bloom">${bloomOptions}</select>
              <button class="btn btn-sm" data-idx="${idx}" data-action="regen-cpmk" style="margin-top:6px;width:100%;">↻ Ganti kata kerja</button>
            </div>
          </div>
          <p class="hint" style="margin:0;">Terkait CPL: <span style="display:inline-block;">${cplChecks || '<span style="text-transform:none;color:var(--muted);">(tidak ada CPL terpasang pada MK)</span>'}</span></p>
        </div>
        <button class="btn-danger-text" data-idx="${idx}" data-action="del-cpmk">Hapus</button>
      </div>`;
    wrap.appendChild(div);
    div.querySelector('.cpmk-bloom').value = m.bloomLevel;
  });
  wrap.querySelectorAll('.cpmk-desc').forEach(inp=>inp.addEventListener('input',e=>{state.cpmk[e.target.dataset.idx].deskripsi=e.target.value;}));
  wrap.querySelectorAll('.cpmk-cpl-check').forEach(chk=>chk.addEventListener('change',e=>{
    const idx = e.target.dataset.idx, kode = e.target.dataset.kode;
    const m = state.cpmk[idx];
    if(e.target.checked){ if(!m.cplKodes.includes(kode)) m.cplKodes.push(kode); }
    else { m.cplKodes = m.cplKodes.filter(k=>k!==kode); }
    m.cplNeedsReview = false;
    renderCpmk();
  }));
  wrap.querySelectorAll('.cpmk-bloom').forEach(inp=>inp.addEventListener('change',e=>{
    const cpmkId = state.cpmk[e.target.dataset.idx].id;
    state.cpmk[e.target.dataset.idx].bloomLevel = e.target.value;
    state.subCpmk.forEach(s=>{
      if(s.cpmkId===cpmkId){
        s.bloomLevel = e.target.value;
        syncEvaluasiJenisForSub(s.id);
      }
    });
    renderSubCpmk();renderEvaluasi();renderRubrik();
  }));
  wrap.querySelectorAll('[data-action=regen-cpmk]').forEach(b=>b.addEventListener('click',e=>{
    const m = state.cpmk[e.target.dataset.idx];
    let bkText = m.bkSource ? BK_BANK[m.bkSource] : m.deskripsi.replace(/^Mahasiswa\s+mampu\s+\S+\s+/i,'');
    bkText = bkText.replace(/\s+dengan\s+[^.]*\.?\s*$/i,'');
    const verbs = KKO_BANK[m.bloomLevel].verbs;
    const currentVerb = (m.deskripsi.match(/^Mahasiswa\s+mampu\s+(\S+)/i)||[])[1] || '';
    let idx2 = verbs.findIndex(v=>v.toLowerCase().startsWith((currentVerb||'').toLowerCase()));
    idx2 = (idx2+1) % verbs.length;
    m.deskripsi = `Mahasiswa mampu ${verbs[idx2].toLowerCase()} ${lowerFirst(bkText)} dengan ${STANDAR_HARAPAN_BY_BLOOM[m.bloomLevel]}.`;
    renderCpmk();
  }));
  wrap.querySelectorAll('[data-action=del-cpmk]').forEach(b=>b.addEventListener('click',e=>{
    const removedId = state.cpmk[e.target.dataset.idx].id;
    state.cpmk.splice(e.target.dataset.idx,1);
    const orphaned = state.subCpmk.filter(s=>s.cpmkId===removedId).map(s=>s.id);
    state.subCpmk = state.subCpmk.filter(s=>s.cpmkId!==removedId);
    state.evaluasi = state.evaluasi.filter(ev=>!orphaned.includes(ev.subCpmkId));
    state.rubrik = state.rubrik.filter(r=>!orphaned.includes(r.linkedSubCpmkId));
    state.weeks.forEach(w=>{if(orphaned.includes(w.subCpmkId)) w.subCpmkId='';});
    renderCpmk();renderSubCpmk();renderWeeks();renderEvaluasi();renderRubrik();
  }));
}

// ============ SUB-CPMK: generate otomatis dari materi + CPMK induk ============
function renderSubCpmk(){
  const wrap = document.getElementById('subcpmk-list');
  wrap.innerHTML='';
  if(state.cpmk.length===0){
    wrap.innerHTML = '<p class="empty-hint">Tambahkan CPMK terlebih dahulu.</p>';
  } else if(state.subCpmk.length===0){
    wrap.innerHTML = '<p class="empty-hint">Belum ada Sub-CPMK.</p>';
  }
  const cpmkOptions = state.cpmk.map((m,mi)=>`<option value="${m.id}">CPMK${mi+1}</option>`).join('');
  state.subCpmk.forEach((s,idx)=>{
    const div = document.createElement('div');
    div.className='row-item';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="flex:1;">
          <div class="grid2">
            <div class="field" style="margin-bottom:8px;">
              <label>CPMK induk</label>
              <select data-idx="${idx}" class="subcpmk-parent"><option value="">—</option>${cpmkOptions}</select>
            </div>
            <div class="field" style="margin-bottom:8px;">
              <label>Materi / kajian minggu ini</label>
              <input type="text" data-idx="${idx}" class="subcpmk-materi" value="${escapeHtml(s.materi)}" placeholder="cth: aksioma dan postulat Euclid">
            </div>
          </div>
          <label>Sub-CPMK (otomatis, bisa diedit)</label>
          <div style="display:flex;gap:8px;align-items:flex-start;">
            <textarea data-idx="${idx}" class="subcpmk-desc" style="flex:1;">${escapeHtml(s.deskripsi)}</textarea>
            <button class="btn btn-sm" data-idx="${idx}" data-action="regen-subcpmk" title="Ganti kata kerja">↻</button>
          </div>
        </div>
        <button class="btn-danger-text" data-idx="${idx}" data-action="del-subcpmk">Hapus</button>
      </div>`;
    wrap.appendChild(div);
    div.querySelector('.subcpmk-parent').value = s.cpmkId || '';
  });
  wrap.querySelectorAll('.subcpmk-parent').forEach(sel=>sel.addEventListener('change',e=>{
    state.subCpmk[e.target.dataset.idx].cpmkId = e.target.value;
    updateSubCpmkBloomLevel(e.target.dataset.idx);
    autoGenerateSubCpmk(e.target.dataset.idx);
    syncEvaluasiJenisForSub(state.subCpmk[e.target.dataset.idx].id);
    renderSubCpmk();renderKorelasi();renderEvaluasi();renderRubrik();
  }));
  wrap.querySelectorAll('.subcpmk-materi').forEach(inp=>inp.addEventListener('input',e=>{
    state.subCpmk[e.target.dataset.idx].materi = e.target.value;
    autoGenerateSubCpmk(e.target.dataset.idx);
    const ta = wrap.querySelectorAll('.subcpmk-desc')[e.target.dataset.idx];
    if(ta) ta.value = state.subCpmk[e.target.dataset.idx].deskripsi;
    renderWeeks();renderEvaluasi();
  }));
  wrap.querySelectorAll('.subcpmk-desc').forEach(inp=>inp.addEventListener('input',e=>{state.subCpmk[e.target.dataset.idx].deskripsi=e.target.value;renderWeeks();renderEvaluasi();}));
  wrap.querySelectorAll('[data-action=regen-subcpmk]').forEach(b=>b.addEventListener('click',e=>{
    const idx = e.target.dataset.idx;
    const s = state.subCpmk[idx];
    s.verbSeed = (s.verbSeed||0)+1;
    autoGenerateSubCpmk(idx);
    renderSubCpmk();
  }));
  wrap.querySelectorAll('[data-action=del-subcpmk]').forEach(b=>b.addEventListener('click',e=>{
    const removedId = state.subCpmk[e.target.dataset.idx].id;
    state.subCpmk.splice(e.target.dataset.idx,1);
    state.weeks.forEach(w=>{if(w.subCpmkId===removedId) w.subCpmkId='';});
    state.evaluasi = state.evaluasi.filter(ev=>ev.subCpmkId!==removedId);
    state.rubrik = state.rubrik.filter(r=>r.linkedSubCpmkId!==removedId);
    renderSubCpmk();renderWeeks();renderKorelasi();renderEvaluasi();renderRubrik();
  }));
  renderKorelasi();
}
function updateSubCpmkBloomLevel(idx){
  const s = state.subCpmk[idx];
  const parent = state.cpmk.find(m=>m.id===s.cpmkId);
  s.bloomLevel = parent ? parent.bloomLevel : 'C2';
}
function autoGenerateSubCpmk(idx){
  const s = state.subCpmk[idx];
  if(!s.materi){ return; }
  const parent = state.cpmk.find(m=>m.id===s.cpmkId);
  const level = parent ? parent.bloomLevel : detectBloomLevel(s.materi);
  const seed = s.verbSeed||0;
  const verb = kkoVerbFor(level, seed);
  s.deskripsi = `Mahasiswa mampu ${verb.toLowerCase()} ${lowerFirst(s.materi)} dengan ${STANDAR_HARAPAN_BY_BLOOM[level]}.`;
}
document.getElementById('btn-add-subcpmk').addEventListener('click',()=>{
  if(state.cpmk.length===0){ alert('Tambahkan CPMK terlebih dahulu.'); return; }
  const newSub = {id:uid(),cpmkId:state.cpmk[0].id,materi:'',deskripsi:'',verbSeed:0,bloomLevel:state.cpmk[0].bloomLevel};
  state.subCpmk.push(newSub);
  createEvaluasiForSubCpmk(newSub);
  renderSubCpmk();renderWeeks();renderEvaluasi();renderRubrik();
});

// ============ KORELASI CPMK x SUB-CPMK (otomatis) ============
function renderKorelasi(){
  const wrap = document.getElementById('korelasi-wrap');
  if(state.cpmk.length===0 || state.subCpmk.length===0){
    wrap.innerHTML = '<p class="empty-hint">Korelasi akan muncul otomatis setelah Sub-CPMK dikaitkan ke CPMK induk.</p>';
    return;
  }
  let html = '<div style="overflow-x:auto;"><table class="matrix-table"><tr><th>CPMK \\ Sub-CPMK</th>';
  state.subCpmk.forEach((s,si)=>{html += `<th>Sub${si+1}</th>`;});
  html += '</tr>';
  state.cpmk.forEach((m,mi)=>{
    html += `<tr><td class="matrix-rowlabel">CPMK${mi+1}</td>`;
    state.subCpmk.forEach(s=>{
      html += `<td class="matrix-cell">${s.cpmkId===m.id ? '<span class="matrix-check">&#10003;</span>' : ''}</td>`;
    });
    html += '</tr>';
  });
  html += '</table></div>';
  wrap.innerHTML = html;
}

// ============ REFERENSI ============
function renderReferensi(){
  const wrap = document.getElementById('referensi-list');
  wrap.innerHTML='';
  if(state.referensi.length===0){ wrap.innerHTML = '<p class="empty-hint">Belum ada referensi.</p>'; }
  state.referensi.forEach((r,idx)=>{
    const div = document.createElement('div');
    div.className='ref-row';
    div.innerHTML = `<span class="ref-num">${idx+1}.</span>
      <input type="text" data-idx="${idx}" class="ref-teks" value="${escapeHtml(r.teks)}" placeholder="Penulis, judul, tahun">
      <button class="btn-danger-text" data-idx="${idx}" data-action="del-ref">Hapus</button>`;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('.ref-teks').forEach(inp=>inp.addEventListener('input',e=>{state.referensi[e.target.dataset.idx].teks=e.target.value;}));
  wrap.querySelectorAll('[data-action=del-ref]').forEach(b=>b.addEventListener('click',e=>{state.referensi.splice(e.target.dataset.idx,1);renderReferensi();}));
}
document.getElementById('btn-add-ref').addEventListener('click',()=>{state.referensi.push({id:uid(),teks:''});renderReferensi();});

