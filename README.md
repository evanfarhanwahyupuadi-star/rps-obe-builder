# RPS OBE Builder

## Testing sebelum rilis

Aplikasi ini tidak punya test otomatis penuh (belum sepadan untuk
ukuran & tim sekecil ini), tapi ada dua jaring pengaman — pakai
**setiap kali** ada perubahan kode:

1. **`CHECKLIST.md`** — checklist manual ±10 menit, klik-klik langsung
   di browser mengikuti alur dosen mengisi RPS dari tab 1 sampai
   export. Ini yang utama; wajib dijalankan sebelum rilis.
2. **`dev/smoke-test.js`** — uji otomatis pelengkap (opsional, perlu
   Node.js) yang mengecek alur data inti tanpa perlu klik manual:
   ```bash
   cd dev
   npm install
   npm test
   ```
   Ini tidak menggantikan checklist manual — tidak bisa mengecek
   tampilan visual atau apakah file `.docx`/`.csv` yang diunduh benar-benar
   rapi saat dibuka di Word/Excel.

## Struktur file

```
rps-app/
├── index.html              # markup + CSS (tidak berubah dari versi asli)
├── data.js                 # bank data (CPL/BK/Bloom/MK) + state global aplikasi
├── cpl-cpmk.js              # tab Identitas, CPL, CPMK & Sub-CPMK
├── rencana-mingguan.js      # tab Rencana Mingguan & Rencana Evaluasi
├── penilaian.js              # tab Penilaian (roster, nilai, upload Excel, rubrik)
├── export.js                # Save/Load JSON, export CSV/DOC, & init aplikasi
└── vendor/
    └── xlsx.full.min.js    # library SheetJS v0.18.5 (baca/tulis file Excel)
```

Awalnya semua ada dalam satu file HTML (~565 KB), lalu dipisah bertahap:
1. **Tahap 1** — pisahkan vendor library dari kode aplikasi (`app.js` tunggal).
2. **Tahap 2** — pecah `app.js` jadi modul per-tab di atas.

Urutan file `<script>` di `index.html` **penting** — setiap file memakai
fungsi/variabel yang didefinisikan di file sebelumnya (bukan ES module,
jadi urutan pemuatan = urutan eksekusi, sama seperti versi satu-file asli).
Jangan mengubah urutannya tanpa memindahkan juga fungsi yang saling
bergantung.

**Cara pakai:** buka `index.html` di browser seperti biasa. Karena file-nya
memuat `<script src="...">` ke file lain, `index.html` harus dibuka lewat
web server lokal (bukan langsung `file://`) agar tidak diblokir kebijakan
CORS browser. Cara termudah:

```bash
cd rps-app
python3 -m http.server 8000
# lalu buka http://localhost:8000 di browser
```

## ⚠️ TODO keamanan: update library xlsx

`vendor/xlsx.full.min.js` masih **v0.18.5**, yang punya kerentanan
*Prototype Pollution* yang diketahui publik ([CVE-2023-30533](https://security.snyk.io/vuln/SNYK-JS-XLSX-5457926))
saat membaca file `.xlsx` yang sengaja dibuat jahat (relevan untuk fitur
upload roster mahasiswa).

Perbaikannya (v0.19.3 ke atas) **hanya** dirilis lewat CDN resmi SheetJS —
tidak pernah dipublikasikan ke npm, dan mirror GitHub mereka juga
tidak sinkron. Langkah update:

1. Unduh: `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`
2. Ganti isi `vendor/xlsx.full.min.js` dengan file tersebut (sisakan
   header komentar di atas, ganti nomor versinya).
3. Cek ulang fitur upload roster Excel & export nilai masih jalan normal.
4. Update catatan versi di file ini.

## Riwayat perubahan

- **Tahap 1** — Dipisah dari file HTML tunggal menjadi
  `index.html` / `app.js` / `vendor/xlsx.full.min.js`. Tidak ada
  perubahan logic maupun markup, murni pemisahan struktur file.
  Isu keamanan library xlsx (lihat di atas) belum diperbaiki karena
  keterbatasan akses jaringan saat pengerjaan — masih memakai v0.18.5.
- **Tahap 2** — `app.js` dipecah jadi 5 modul per-tab (`data.js`,
  `cpl-cpmk.js`, `rencana-mingguan.js`, `penilaian.js`, `export.js`).
  Diverifikasi baris-per-baris bahwa gabungan kelima file identik
  dengan `app.js` sebelumnya (tidak ada logic yang berubah/hilang),
  dan diuji fungsional dengan jsdom: pilih mata kuliah → generate
  CPMK → tambah mahasiswa → simpan state, semua lintas-file berjalan
  tanpa error.
- **Tahap 3** — Ditambahkan `CHECKLIST.md` (uji manual) dan
  `dev/smoke-test.js` (uji otomatis pelengkap via jsdom). Saat
  menulis skrip otomatis ini, ditemukan 2 asumsi alur yang salah
  di skrip (bukan bug aplikasi): Sub-CPMK tidak auto-generate dari
  CPMK (harus ditambah manual via tombol), dan tab Rencana Evaluasi
  baru mensinkronkan data dari Sub-CPMK saat tabnya dibuka. Setelah
  skrip diperbaiki mengikuti alur yang benar, seluruh 8 kelompok
  pemeriksaan lolos tanpa error.
