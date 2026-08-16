# Checklist Smoke Test — RPS OBE Builder

Jalankan checklist ini **setiap kali ada perubahan kode** (sebelum
dianggap "aman dipakai lagi"), khususnya setelah:
- mengganti `vendor/xlsx.full.min.js`
- mengedit salah satu dari `data.js`, `cpl-cpmk.js`, `rencana-mingguan.js`,
  `penilaian.js`, `export.js`
- menambah fitur baru

Cukup ikuti urutan di bawah dari atas ke bawah — urutannya sengaja
meniru alur kerja dosen mengisi RPS dari nol, karena tab-tab belakangan
bergantung pada data yang diisi di tab awal. Total waktu: ±10 menit.

Buka aplikasi lewat `python3 -m http.server` (lihat README), bukan
klik dua kali file — kalau dibuka lewat `file://` langsung, semua
tombol akan gagal karena file JS terpisah tidak bisa dimuat browser.

---

## 1. Tab "1. Pilih Mata Kuliah"
- [ ] Saat halaman pertama dibuka, dropdown pemilih mata kuliah **sudah
      terisi daftar** (tidak kosong).
- [ ] Pilih salah satu mata kuliah dari dropdown → field **Kode MK,
      Bobot SKS, Semester, Nama mata kuliah** otomatis terisi.
- [ ] Ketik sesuatu di field **Deskripsi singkat MK** → tulisan
      tersimpan (tidak hilang saat pindah tab lalu kembali).
- [ ] Klik **"+ Tambah referensi"** → baris referensi baru muncul.

## 2. Tab "2. CPL, CPMK & Sub-CPMK"
- [ ] Daftar **CPL-Prodi** muncul dan sesuai mata kuliah yang dipilih
      di tab 1.
- [ ] **Bahan kajian** mata kuliah ini tampil.
- [ ] Klik **"⚡ Generate CPMK dari Bahan Kajian"** → daftar CPMK
      terisi otomatis (tidak kosong, tidak error/nge-freeze).
- [ ] Klik **"+ Tambah CPMK manual"** → baris CPMK baru bisa ditambah.
- [ ] Cek daftar **Sub-CPMK** ikut ter-generate dari CPMK di atasnya.
- [ ] Klik **"+ Tambah Sub-CPMK"** → baris baru bisa ditambah.
- [ ] Tabel **Korelasi CPMK dengan Sub-CPMK** tampil dan tidak kosong.

## 3. Tab "3. Rencana Mingguan"
- [ ] Tabel 16 minggu tampil lengkap (baris minggu 1 sampai 16).
- [ ] Pilih Sub-CPMK di salah satu baris minggu → kolom lain di baris
      itu (materi, bentuk, metode, dst) ikut terisi/berubah wajar.

## 4. Tab "4. Rencana Evaluasi"
- [ ] Daftar rencana evaluasi tampil, berkorespondensi 1:1 dengan
      Sub-CPMK yang sudah dibuat di tab 2.
- [ ] Klik **"⚙ Hitung bobot otomatis"** → bobot setiap baris terisi,
      dan bar total di bawah menunjukkan **100%** (atau jelas berapa
      totalnya jika belum pas).

## 5. Tab "5. Rekap Penilaian"
- [ ] Klik **"+ Tambah mahasiswa manual"** → baris mahasiswa baru
      muncul di tabel nilai.
- [ ] Isi NIM/nama dan satu nilai Sub-CPMK → angka tersimpan, dan
      tabel **"Ketercapaian CPL per mahasiswa"** & **"Ringkasan kelas"**
      di bawahnya ikut ter-update.
- [ ] Klik **"Unduh template kosong"** → file terunduh, bisa dibuka di
      Excel, kolomnya sesuai (NIM, Nama, dst).
- [ ] Isi template tadi dengan 2–3 baris data dummy, lalu klik
      **"📤 Unggah file mahasiswa"** dan pilih file itu → data masuk ke
      tabel tanpa error.
- [ ] Tabel **Kriteria penilaian** tampil; klik **"+ Tambah baris"**
      → baris baru bisa ditambah.

## 6. Tab "6. Rubrik Tugas"
- [ ] Klik **"+ Tambah rubrik"** → rubrik baru muncul dengan aspek
      penilaian & deskriptor level 1–5 terisi wajar (tidak kosong).

## 7. Simpan, Muat, dan Export
- [ ] Klik **"Simpan draf (.json)"** → file `.json` terunduh.
- [ ] **Refresh halaman browser** (state jadi kosong lagi), lalu klik
      **"Muat draf (.json)"** dan pilih file yang baru diunduh → semua
      data dari tab 1–6 kembali seperti semula (cek minimal 2–3 tab).
- [ ] Klik **"Unduh rekap penilaian (.csv)"** → file terunduh, bisa
      dibuka, isinya sesuai data mahasiswa & nilai.
- [ ] Klik **"Unduh dokumen RPS (.doc)"** → file terunduh, bisa dibuka
      di Word, formatnya rapi (bukan teks berantakan).

## 8. Cek konsol browser (khusus kalau Anda/IT sedang mengedit kode)
- [ ] Buka DevTools browser (`F12`) → tab **Console** → ulangi langkah
      1–7 → **tidak ada tulisan merah (error)** yang muncul.

---

### Kalau ada yang gagal
Jangan lanjut pakai versi barunya untuk kerja sungguhan. Kembalikan ke
salinan sebelumnya (makanya penting simpan versi lama sebelum mengedit —
lihat bagian Git di README), lalu telusuri lagi bagian yang gagal.
