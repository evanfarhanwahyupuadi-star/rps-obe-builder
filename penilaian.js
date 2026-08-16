/*!
 * RPS OBE Builder - Tab: Penilaian
 * Student roster, grade entry, Excel upload, grading scale, rubrik tugas.
 * Depends on: vendor/xlsx.full.min.js, and files loaded before this one
 *   (see index.html for the required <script> order).
 */
// ============ PENILAIAN (nilai per Sub-CPMK) ============
function nilaiKeyFor(ev){ return ev.subCpmkId || ev.id; }
function studentFinalScore(student){
  let total=0;
  state.evaluasi.forEach(ev=>{
    const nilai = parseFloat(student.nilai[nilaiKeyFor(ev)]);
    const bobot = parseFloat(ev.bobot);
    if(!isNaN(nilai) && !isNaN(bobot)) total += nilai*(bobot/100);
  });
  return total;
}
function studentCplScore(student, cplKode){
  let total=0, bobotSum=0;
  state.evaluasi.forEach(ev=>{
    const bobot = parseFloat(ev.bobot);
    if(isNaN(bobot)) return;
    if(ev.examType){
      // UTS/UAS mencakup beberapa Sub-CPMK sekaligus — bobotnya diproporsikan ke CPL yang tercakup
      const covered = coveredSubCpmkIds(ev.examType);
      if(covered.length===0) return;
      const matched = covered.filter(id=>{
        const sub = state.subCpmk.find(s=>s.id===id);
        const cpmk = sub ? state.cpmk.find(m=>m.id===sub.cpmkId) : null;
        return cpmk && cpmk.cplKodes.includes(cplKode);
      });
      if(matched.length===0) return;
      const nilai = parseFloat(student.nilai[ev.id]);
      if(isNaN(nilai)) return;
      const share = bobot * (matched.length/covered.length);
      total += nilai*(share/100); bobotSum += share;
    } else {
      const sub = state.subCpmk.find(s=>s.id===ev.subCpmkId);
      const cpmk = sub ? state.cpmk.find(m=>m.id===sub.cpmkId) : null;
      if(cpmk && cpmk.cplKodes.includes(cplKode)){
        const nilai = parseFloat(student.nilai[ev.subCpmkId]);
        if(!isNaN(nilai)){ total += nilai*(bobot/100); bobotSum += bobot; }
      }
    }
  });
  if(bobotSum===0) return null;
  return (total/bobotSum)*100;
}
function classAverageForSub(subCpmkId){
  const vals = state.mahasiswa.map(s=>parseFloat(s.nilai[subCpmkId])).filter(v=>!isNaN(v));
  if(vals.length===0) return null;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function hurufMutuFor(score){
  const row = state.gradingScale.find(g=>score>=parseFloat(g.min) && score<=parseFloat(g.max));
  return row ? row.hm : '—';
}
function renderPenilaian(){
  document.getElementById('f-threshold').value = state.threshold;
  renderMhsTable();renderMhsCplTable();renderClassSummary();renderGradingScale();
}
document.getElementById('f-threshold').addEventListener('input',e=>{state.threshold=parseFloat(e.target.value)||0;renderMhsCplTable();renderClassSummary();});
document.getElementById('btn-add-mhs').addEventListener('click',()=>{state.mahasiswa.push({id:uid(),nim:'',nama:'',nilai:{}});renderMhsTable();renderMhsCplTable();renderClassSummary();renderRubrik();});
function renderMhsTable(){
  const tbl = document.getElementById('mhs-nilai-table');
  if(state.subCpmk.length===0){
    tbl.innerHTML = '<tr><td class="empty-hint">Belum ada Sub-CPMK. Lengkapi dulu di tab CPL, CPMK &amp; Sub-CPMK.</td></tr>';
    return;
  }
  if(state.mahasiswa.length===0){
    tbl.innerHTML = '<tr><td class="empty-hint">Belum ada mahasiswa. Klik "+ Tambah mahasiswa" atau unggah file roster di bawah.</td></tr>';
    return;
  }
  const examEvals = state.evaluasi.filter(e=>e.examType);
  const subHeaders = state.subCpmk.map((s,si)=>{
    const ev = state.evaluasi.find(e=>e.subCpmkId===s.id);
    return `<th style="width:60px;" title="${escapeHtml(ev?ev.jenisEvaluasi:'')}">Sub${si+1}</th>`;
  }).join('') + examEvals.map(ev=>`<th style="width:60px;" title="${escapeHtml(ev.jenisEvaluasi)}">${ev.examType}</th>`).join('');
  const rows = state.mahasiswa.map((s,idx)=>{
    const nilaiCells = state.subCpmk.map(sub=>{
      const v = s.nilai[sub.id];
      return `<td style="text-align:center;color:var(--ink-2);font-weight:600;" title="Diisi dari tab Rubrik Tugas">${v?Math.round(parseFloat(v)*10)/10:'—'}</td>`;
    }).join('') + examEvals.map(ev=>{
      const v = s.nilai[ev.id];
      return `<td style="text-align:center;color:var(--ink-2);font-weight:600;" title="Diisi dari tab Rubrik Tugas">${v?Math.round(parseFloat(v)*10)/10:'—'}</td>`;
    }).join('');
    const fs = studentFinalScore(s);
    return `<tr>
      <td><input type="text" data-idx="${idx}" class="mhs-nim" value="${escapeHtml(s.nim)}" placeholder="NIM" style="width:90px;"></td>
      <td><input type="text" data-idx="${idx}" class="mhs-nama" value="${escapeHtml(s.nama)}" placeholder="Nama" style="width:130px;"></td>
      ${nilaiCells}
      <td id="final-${s.id}" style="font-weight:600;">${Math.round(fs*10)/10}</td>
      <td id="hm-${s.id}" style="font-weight:600;">${hurufMutuFor(fs)}</td>
      <td><button class="btn-danger-text" data-idx="${idx}" data-action="del-mhs">Hapus</button></td>
    </tr>`;
  }).join('');
  const avgRow = `<tr style="background:var(--paper-2);font-weight:600;"><td colspan="2">Rata-rata kelas</td>${state.subCpmk.map(sub=>`<td id="avg-sub-${sub.id}">${fmtPct(classAverageForSub(sub.id))}</td>`).join('')}${examEvals.map(ev=>`<td>${fmtPct(classAverageForSub(ev.id))}</td>`).join('')}<td colspan="3"></td></tr>`;
  tbl.innerHTML = `<tr><th style="width:90px;">NIM</th><th style="width:130px;">Nama</th>${subHeaders}<th style="width:60px;">Nilai akhir</th><th style="width:50px;">HM</th><th style="width:60px;"></th></tr>${rows}${avgRow}`;
  tbl.querySelectorAll('.mhs-nim').forEach(inp=>inp.addEventListener('input',e=>{state.mahasiswa[e.target.dataset.idx].nim=e.target.value;renderRubrik();}));
  tbl.querySelectorAll('.mhs-nama').forEach(inp=>inp.addEventListener('input',e=>{state.mahasiswa[e.target.dataset.idx].nama=e.target.value;renderMhsCplTable();renderRubrik();}));
  tbl.querySelectorAll('[data-action=del-mhs]').forEach(b=>b.addEventListener('click',e=>{state.mahasiswa.splice(e.target.dataset.idx,1);renderMhsTable();renderMhsCplTable();renderClassSummary();renderRubrik();}));
}
function renderMhsCplTable(){
  const tbl = document.getElementById('mhs-cpl-table');
  if(state.cplSelected.length===0){tbl.innerHTML='<tr><td class="empty-hint">Belum ada CPL.</td></tr>';return;}
  if(state.mahasiswa.length===0){tbl.innerHTML='<tr><td class="empty-hint">Belum ada mahasiswa.</td></tr>';return;}
  const cplHeaders = state.cplSelected.map(k=>`<th style="width:100px;">${k}</th>`).join('');
  const rows = state.mahasiswa.map(s=>{
    const cells = state.cplSelected.map(k=>{
      const avg = studentCplScore(s,k);
      if(avg===null) return '<td>—</td>';
      const status = avg>=state.threshold ? '<span class="status-pill tercapai">Tercapai</span>' : '<span class="status-pill belum">Belum</span>';
      return `<td>${Math.round(avg*10)/10}% ${status}</td>`;
    }).join('');
    return `<tr><td>${escapeHtml(s.nim||'—')}</td><td>${escapeHtml(s.nama||'(tanpa nama)')}</td>${cells}</tr>`;
  }).join('');
  tbl.innerHTML = `<tr><th style="width:90px;">NIM</th><th style="width:130px;">Nama</th>${cplHeaders}</tr>${rows}`;
}
function renderClassSummary(){
  const tbl = document.getElementById('cpl-rekap-table');
  if(state.cplSelected.length===0){tbl.innerHTML='<tr><td class="empty-hint">Belum ada CPL.</td></tr>';return;}
  tbl.innerHTML = '<tr><th>CPL</th><th>Rata-rata kelas</th><th style="width:150px;">Mahasiswa tercapai</th></tr>' +
    state.cplSelected.map(k=>{
      const studentAvgs = state.mahasiswa.map(s=>studentCplScore(s,k)).filter(v=>v!==null);
      const classAvg = studentAvgs.length ? (studentAvgs.reduce((a,b)=>a+b,0)/studentAvgs.length) : null;
      const tercapaiCount = studentAvgs.filter(v=>v>=state.threshold).length;
      const countDisplay = studentAvgs.length===0?'—':`${tercapaiCount} / ${studentAvgs.length} mahasiswa`;
      return `<tr><td><span class="badge-mono" style="color:var(--ink-2);background:var(--paper-2);border-color:var(--line);">${k}</span></td><td>${fmtPct(classAvg)}</td><td>${countDisplay}</td></tr>`;
    }).join('');
}

// ============ UPLOAD FILE MAHASISWA (xlsx/csv, bundled offline) ============
document.getElementById('btn-upload-mhs').addEventListener('click',()=>{document.getElementById('file-upload-mhs').click();});
document.getElementById('file-upload-mhs').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = evt=>{
    try{
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, {type:'array'});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {defval:''});
      if(rows.length===0){ alert('File kosong atau format tidak terbaca.'); return; }
      const keys = Object.keys(rows[0]);
      const nimKey = keys.find(k=>/nim|npm|induk/i.test(k)) || keys[0];
      const namaKey = keys.find(k=>/nama/i.test(k)) || keys[1] || keys[0];
      const imported = rows.map(r=>({id:uid(), nim:String(r[nimKey]||'').trim(), nama:String(r[namaKey]||'').trim(), nilai:{}}))
        .filter(r=>r.nim || r.nama);
      if(imported.length===0){ alert('Tidak ada baris NIM/Nama yang terbaca. Pastikan file punya kolom NIM dan Nama.'); return; }
      let proceed = true;
      if(state.mahasiswa.length>0){
        proceed = confirm(`Ada ${state.mahasiswa.length} mahasiswa yang sudah diinput. Ganti dengan ${imported.length} data dari file? (Klik Batal untuk menambahkan di akhir daftar, bukan mengganti)`);
      }
      if(proceed){
        state.mahasiswa = imported;
      } else {
        state.mahasiswa = state.mahasiswa.concat(imported);
      }
      renderMhsTable();renderMhsCplTable();renderClassSummary();renderRubrik();
      alert(`${imported.length} mahasiswa berhasil dimuat dari file.`);
    }catch(err){
      alert('Gagal membaca file. Pastikan formatnya .xlsx, .xls, atau .csv dengan kolom NIM dan Nama.');
    }
    e.target.value = '';
  };
  reader.readAsArrayBuffer(file);
});
document.getElementById('btn-download-template').addEventListener('click',()=>{
  const wsData = [['NIM','Nama'],['2211001','Contoh Nama Mahasiswa'],['2211002','']];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mahasiswa');
  XLSX.writeFile(wb, 'Template-Daftar-Mahasiswa.xlsx');
});

// ============ GRADING SCALE ============
function renderGradingScale(){
  const tbl = document.getElementById('grading-scale-table');
  tbl.innerHTML = '<tr><th>Huruf mutu</th><th>Sebutan</th><th>Min</th><th>Maks</th><th>Angka mutu</th><th></th></tr>' +
    state.gradingScale.map((g,idx)=>`<tr>
      <td><input type="text" data-idx="${idx}" class="gs-hm" value="${escapeHtml(g.hm)}" style="width:50px;"></td>
      <td><input type="text" data-idx="${idx}" class="gs-sm" value="${escapeHtml(g.sm)}" style="width:100px;"></td>
      <td><input type="number" data-idx="${idx}" class="gs-min" value="${g.min}" style="width:65px;"></td>
      <td><input type="number" data-idx="${idx}" class="gs-max" value="${g.max}" style="width:65px;"></td>
      <td><input type="number" step="0.1" data-idx="${idx}" class="gs-am" value="${g.am}" style="width:55px;"></td>
      <td><button class="btn-danger-text" data-idx="${idx}" data-action="del-gs">Hapus</button></td>
    </tr>`).join('');
  const map = {'gs-hm':'hm','gs-sm':'sm','gs-min':'min','gs-max':'max','gs-am':'am'};
  Object.keys(map).forEach(cls=>{tbl.querySelectorAll('.'+cls).forEach(inp=>inp.addEventListener('input',e=>{state.gradingScale[e.target.dataset.idx][map[cls]]=e.target.value;renderMhsTable();}));});
  tbl.querySelectorAll('[data-action=del-gs]').forEach(b=>b.addEventListener('click',e=>{state.gradingScale.splice(e.target.dataset.idx,1);renderGradingScale();renderMhsTable();}));
}
document.getElementById('btn-add-gs').addEventListener('click',()=>{state.gradingScale.push({id:uid(),hm:'',sm:'',min:0,max:0,am:0});renderGradingScale();});

// ============ RUBRIK TUGAS (otomatis dari Sub-CPMK = sumber utama nilai; manual = rubrik lepas) ============
// Rubrik yang terkait Sub-CPMK (linkedSubCpmkId) memakai daftar mahasiswa dari tab Rekap Penilaian sebagai
// subjek yang dinilai, dan hasilnya otomatis mengisi kolom nilai Sub-CPMK terkait di tab Rekap Penilaian —
// jadi nilai hanya diinput SEKALI, di sini. Rubrik yang ditambah manual (tanpa keterkaitan) tetap memakai
// daftar subjek bebas seperti sebelumnya, untuk kebutuhan penilaian di luar rencana evaluasi.
function propagateRubrikToNilai(rubrik){
  if(!rubrik.linkedSubCpmkId) return;
  state.mahasiswa.forEach(m=>{
    const skorMap = (rubrik.skorByStudent && rubrik.skorByStudent[m.id]) || {};
    const nilai5 = rubrikNilai5(rubrik, {skor:skorMap});
    if(nilai5!==null) m.nilai[rubrik.linkedSubCpmkId] = Math.round(nilai5*20*10)/10;
  });
}
function renderRubrik(){
  const wrap = document.getElementById('rubrik-list');
  wrap.innerHTML='';
  if(state.rubrik.length===0){
    wrap.innerHTML = '<p class="empty-hint">Rubrik akan muncul otomatis begitu Sub-CPMK ditambahkan (mengikuti jenis evaluasi di tab Rencana Mingguan), atau tambah manual di bawah.</p>';
  }
  state.rubrik.forEach((r,rIdx)=>{
    if(!r.skorByStudent) r.skorByStudent = {};
    const card = document.createElement('div');
    card.className='card';
    const totalBobot = r.aspects.reduce((s,a)=>s+(parseFloat(a.bobot)||0),0);
    const bobotOk = Math.abs(totalBobot-100)<0.01;
    const linkLabel = r.linkedSubCpmkId ? '<span class="badge-mono" style="margin-left:8px;">otomatis — sumber nilai Rekap Penilaian</span>' : '<span class="badge-mono" style="margin-left:8px;">rubrik lepas</span>';
    const aspectRows = r.aspects.map((a,aIdx)=>{
      if(!a.deskriptor) a.deskriptor = genDeskriptorLevels(a.nama);
      const deskriptorRows = [5,4,3,2,1].map(lv=>`
        <tr><td style="width:90px;font-weight:600;color:var(--ink-2);">${lv} — ${RUBRIK_LEVEL_LABEL[lv]}</td>
        <td><textarea data-ridx="${rIdx}" data-aidx="${aIdx}" data-level="${lv}" class="rb-deskriptor" style="min-height:38px;font-size:12px;">${escapeHtml(a.deskriptor[lv]||'')}</textarea></td></tr>`).join('');
      return `<tr>
      <td><input type="text" data-ridx="${rIdx}" data-aidx="${aIdx}" class="rb-aspek-nama" value="${escapeHtml(a.nama)}" placeholder="Aspek"></td>
      <td style="width:90px;"><input type="number" data-ridx="${rIdx}" data-aidx="${aIdx}" class="rb-aspek-bobot" value="${a.bobot}"></td>
      <td style="width:80px;"><button class="btn btn-sm" data-ridx="${rIdx}" data-aidx="${aIdx}" data-action="toggle-deskriptor">Deskriptor</button></td>
      <td style="width:44px;"><button class="btn-danger-text" data-ridx="${rIdx}" data-aidx="${aIdx}" data-action="del-aspek">✕</button></td>
    </tr>
    <tr class="rb-deskriptor-panel" data-ridx="${rIdx}" data-aidx="${aIdx}" style="display:none;">
      <td colspan="4"><table class="rekap-table"><tr><th style="width:90px;">Level</th><th>Deskriptor (bisa diedit)</th></tr>${deskriptorRows}</table></td>
    </tr>`;
    }).join('');

    let scoringBlockHtml;
    if(r.linkedSubCpmkId){
      const subjekHeaderAspek = r.aspects.map(a=>`<th style="width:70px;" title="${escapeHtml(a.nama)}">${escapeHtml((a.nama||'').slice(0,10))}${(a.nama||'').length>10?'…':''}</th>`).join('');
      if(state.mahasiswa.length===0){
        scoringBlockHtml = '<p class="empty-hint">Belum ada mahasiswa — tambahkan di tab Rekap Penilaian terlebih dahulu, daftar akan otomatis muncul di sini.</p>';
      } else {
        const rows = state.mahasiswa.map((m)=>{
          const skorMap = r.skorByStudent[m.id] || {};
          const skorCells = r.aspects.map(a=>{
            const opts = [1,2,3,4,5].map(lv=>`<option value="${lv}" ${String(skorMap[a.id])===String(lv)?'selected':''}>${lv} - ${RUBRIK_LEVEL_LABEL[lv]}</option>`).join('');
            return `<td><select data-ridx="${rIdx}" data-mhsid="${m.id}" data-aspekid="${a.id}" class="rb-skor" style="min-width:110px;font-size:11.5px;"><option value="">—</option>${opts}</select></td>`;
          }).join('');
          const nilai5 = rubrikNilai5(r, {skor:skorMap});
          const nilai100 = nilai5===null?null:nilai5*20;
          return `<tr><td>${escapeHtml(m.nama||m.nim||'(tanpa nama)')}</td>${skorCells}
            <td style="font-weight:600;">${nilai5===null?'—':Math.round(nilai5*100)/100}</td>
            <td style="font-weight:600;">${nilai100===null?'—':Math.round(nilai100*10)/10}</td></tr>`;
        }).join('');
        scoringBlockHtml = `<div style="overflow-x:auto;margin-top:14px;"><table class="rekap-table">
          <tr><th style="width:140px;">Mahasiswa</th>${subjekHeaderAspek}<th style="width:70px;">Nilai (5)</th><th style="width:70px;">Skala 100</th></tr>
          ${rows}
        </table></div>
        <p class="hint" style="margin-top:8px;">Nilai skala 100 di atas otomatis mengisi kolom Sub-CPMK ini di tab Rekap Penilaian.</p>`;
      }
    } else {
      const subjekHeaderAspek = r.aspects.map(a=>`<th style="width:70px;" title="${escapeHtml(a.nama)}">${escapeHtml((a.nama||'').slice(0,10))}${(a.nama||'').length>10?'…':''}</th>`).join('');
      const subjekRows = r.subjek.map((sub,sIdx)=>{
        const skorCells = r.aspects.map(a=>`<td><input type="number" min="1" max="5" data-ridx="${rIdx}" data-sidx="${sIdx}" data-aspekid="${a.id}" class="rb-skor-manual" value="${sub.skor[a.id]||''}" style="width:48px;"></td>`).join('');
        const nilai5 = rubrikNilai5(r, sub);
        const nilai100 = nilai5===null?null:nilai5*20;
        return `<tr>
          <td><input type="text" data-ridx="${rIdx}" data-sidx="${sIdx}" class="rb-subjek-nama" value="${escapeHtml(sub.nama)}" placeholder="Nama" style="width:140px;"></td>
          ${skorCells}
          <td style="font-weight:600;">${nilai5===null?'—':Math.round(nilai5*100)/100}</td>
          <td style="font-weight:600;">${nilai100===null?'—':Math.round(nilai100*10)/10}</td>
          <td><button class="btn-danger-text" data-ridx="${rIdx}" data-sidx="${sIdx}" data-action="del-subjek">✕</button></td>
        </tr>`;
      }).join('');
      scoringBlockHtml = `<div style="overflow-x:auto;margin-top:14px;"><table class="rekap-table">
        <tr><th style="width:140px;">Nama</th>${subjekHeaderAspek}<th style="width:70px;">Nilai (5)</th><th style="width:70px;">Skala 100</th><th></th></tr>
        ${subjekRows || '<tr><td class="empty-hint">Belum ada subjek dinilai.</td></tr>'}
      </table></div>
      <button class="btn btn-sm" data-ridx="${rIdx}" style="margin-top:8px;" data-action="add-subjek">+ Tambah subjek</button>`;
    }

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;">
        <div style="flex:1;display:flex;align-items:center;">
          <input type="text" data-ridx="${rIdx}" class="rb-nama" value="${escapeHtml(r.nama)}" placeholder="Nama rubrik" style="font-weight:600;font-size:15px;flex:1;">
          ${linkLabel}
        </div>
        <button class="btn-danger-text" data-ridx="${rIdx}" data-action="del-rubrik">Hapus rubrik</button>
      </div>
      <table class="rekap-table" style="margin-bottom:6px;"><tr><th>Aspek</th><th>Bobot %</th><th></th><th></th></tr>${aspectRows}</table>
      <div class="totals-bar ${bobotOk?'ok':'warn'}" style="margin-bottom:14px;">Total bobot: ${Math.round(totalBobot*10)/10}%</div>
      <button class="btn btn-sm" data-ridx="${rIdx}" data-action="add-aspek">+ Tambah aspek</button>
      ${scoringBlockHtml}
    `;
    wrap.appendChild(card);
  });
  wrap.querySelectorAll('.rb-nama').forEach(inp=>inp.addEventListener('input',e=>{state.rubrik[e.target.dataset.ridx].nama=e.target.value;}));
  wrap.querySelectorAll('.rb-aspek-nama').forEach(inp=>inp.addEventListener('input',e=>{state.rubrik[e.target.dataset.ridx].aspects[e.target.dataset.aidx].nama=e.target.value;renderRubrik();}));
  wrap.querySelectorAll('.rb-aspek-bobot').forEach(inp=>inp.addEventListener('input',e=>{state.rubrik[e.target.dataset.ridx].aspects[e.target.dataset.aidx].bobot=e.target.value;renderRubrik();}));
  wrap.querySelectorAll('.rb-deskriptor').forEach(ta=>ta.addEventListener('input',e=>{
    const a = state.rubrik[e.target.dataset.ridx].aspects[e.target.dataset.aidx];
    if(!a.deskriptor) a.deskriptor = genDeskriptorLevels(a.nama);
    a.deskriptor[e.target.dataset.level] = e.target.value;
  }));
  wrap.querySelectorAll('[data-action=toggle-deskriptor]').forEach(b=>b.addEventListener('click',e=>{
    const panel = wrap.querySelector(`.rb-deskriptor-panel[data-ridx="${e.target.dataset.ridx}"][data-aidx="${e.target.dataset.aidx}"]`);
    if(panel) panel.style.display = panel.style.display==='none' ? '' : 'none';
  }));
  wrap.querySelectorAll('.rb-subjek-nama').forEach(inp=>inp.addEventListener('input',e=>{state.rubrik[e.target.dataset.ridx].subjek[e.target.dataset.sidx].nama=e.target.value;}));
  wrap.querySelectorAll('.rb-skor-manual').forEach(inp=>inp.addEventListener('input',e=>{state.rubrik[e.target.dataset.ridx].subjek[e.target.dataset.sidx].skor[e.target.dataset.aspekid]=e.target.value;renderRubrik();}));
  wrap.querySelectorAll('.rb-skor').forEach(sel=>sel.addEventListener('change',e=>{
    const r = state.rubrik[e.target.dataset.ridx];
    const mhsId = e.target.dataset.mhsid, aspekId = e.target.dataset.aspekid;
    if(!r.skorByStudent[mhsId]) r.skorByStudent[mhsId] = {};
    r.skorByStudent[mhsId][aspekId] = e.target.value;
    propagateRubrikToNilai(r);
    renderRubrik();renderPenilaian();
  }));
  wrap.querySelectorAll('[data-action=del-rubrik]').forEach(b=>b.addEventListener('click',e=>{state.rubrik.splice(e.target.dataset.ridx,1);renderRubrik();}));
  wrap.querySelectorAll('[data-action=add-aspek]').forEach(b=>b.addEventListener('click',e=>{state.rubrik[e.target.dataset.ridx].aspects.push({id:uid(),nama:'',bobot:'',deskriptor:genDeskriptorLevels('')});renderRubrik();}));
  wrap.querySelectorAll('[data-action=del-aspek]').forEach(b=>b.addEventListener('click',e=>{state.rubrik[e.target.dataset.ridx].aspects.splice(e.target.dataset.aidx,1);renderRubrik();}));
  wrap.querySelectorAll('[data-action=add-subjek]').forEach(b=>b.addEventListener('click',e=>{state.rubrik[e.target.dataset.ridx].subjek.push({id:uid(),nama:'',skor:{}});renderRubrik();}));
  wrap.querySelectorAll('[data-action=del-subjek]').forEach(b=>b.addEventListener('click',e=>{state.rubrik[e.target.dataset.ridx].subjek.splice(e.target.dataset.sidx,1);renderRubrik();}));
}
function rubrikNilai5(rubrik, subjek){
  const totalBobot = rubrik.aspects.reduce((s,a)=>s+(parseFloat(a.bobot)||0),0);
  if(totalBobot===0) return null;
  let weighted=0, hasAny=false;
  rubrik.aspects.forEach(a=>{
    const skor = parseFloat(subjek.skor[a.id]);
    const bobot = parseFloat(a.bobot)||0;
    if(!isNaN(skor)){ weighted += (bobot/totalBobot)*skor; hasAny=true; }
  });
  return hasAny?weighted:null;
}
document.getElementById('btn-add-rubrik').addEventListener('click',()=>{state.rubrik.push({id:uid(),nama:'',aspects:[{id:uid(),nama:'',bobot:'',deskriptor:genDeskriptorLevels('')}],subjek:[],skorByStudent:{},linkedSubCpmkId:null});renderRubrik();});

