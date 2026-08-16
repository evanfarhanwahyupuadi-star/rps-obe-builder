/*!
 * RPS OBE Builder - data & reference banks + shared app state
 * CPL/Bahan Kajian/Bloom/rubrik banks, MK bank, and the global `state` object.
 * Depends on: vendor/xlsx.full.min.js, and files loaded before this one
 *   (see index.html for the required <script> order).
 */
function uid(){return 'id'+Math.random().toString(36).slice(2,9);}
function escapeHtml(s){
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtPct(v){return v===null||v===undefined||isNaN(v) ? '—' : Math.round(v*10)/10+'%';}

// ============ CPL BANK ============
const CPL_BANK = [
  {kode:'S1', kategori:'Sikap', deskripsi:'Menguasai konsep teoritis tentang karakter nasionalis religius berkemajuan, Socio-technopreneur dan keterampilan untuk berpikir secara mandiri, kritis yang bertanggung jawab atas pekerjaan di bidang keahliannya secara mandiri, sebagai wujud pengamalan nilai-nilai Al-Islam, Kemuhammadiyahan, dalam konteks personal, sosial, dan pekerjaan.'},
  {kode:'PP1', kategori:'Penguasaan Pengetahuan', deskripsi:'Menguasai dan mengaplikasikan konsep teoritis tentang kompetensi dasar kependidikan yang diperlukan untuk meningkatkan kualitas pembelajaran dengan menjunjung tinggi nilai kemanusiaan dalam menjalankan tugas berdasarkan agama, moral, dan etika serta berorientasi pada kecakapan hidup bernuansa islami.'},
  {kode:'PP2', kategori:'Penguasaan Pengetahuan', deskripsi:'Menguasai dan mengaplikasikan konsep teoritis dengan memanfaatkan IPTEKS tentang keilmuan matematika yang diperlukan dalam meningkatkan kemampuan intelektual serta berkontribusi dalam peningkatan mutu kehidupan bermasyarakat, berbangsa, bernegara, dan kemajuan peradaban berdasarkan Pancasila.'},
  {kode:'PP3', kategori:'Penguasaan Pengetahuan', deskripsi:'Menguasai dan mengaplikasikan konsep teoritis serta mampu mendesain pembelajaran matematika yang diperlukan untuk merencanakan, melaksanakan, dan mengevaluasi pembelajaran yang inovatif dengan menginternalisasi nilai, norma, dan etika akademik.'},
  {kode:'KU1', kategori:'Keterampilan Umum', deskripsi:'Menguasai dan mengaplikasikan konsep teoritis untuk penguatan kompetensi lanjutan yang diperlukan untuk melanjutkan studi atau keahlian tambahan dalam peningkatan mutu kehidupan bermasyarakat.'},
  {kode:'KU2', kategori:'Keterampilan Umum', deskripsi:'Menguasai, mengkaji, dan mengaplikasikan konsep teoritis serta mendesain penelitian dan publikasi yang diperlukan untuk menyelesaikan masalah baik dalam pembelajaran maupun kehidupan sehari-hari dalam menginternalisasi nilai, norma, dan etika akademik.'},
  {kode:'KU3', kategori:'Keterampilan Umum', deskripsi:'Menguasai dan mengaplikasikan konsep teoritis tentang pengembangan jiwa kewirausahaan untuk menyelesaikan masalah baik dalam pembelajaran maupun kehidupan sehari-hari dengan bertanggungjawab dan menginternalisasi semangat kemandirian, kejuangan, serta kewirausahaan.'},
  {kode:'KK1', kategori:'Keterampilan Khusus', deskripsi:'Menguasai dan mengaplikasikan konsep teoritis tentang Teknologi pendidikan yang diperlukan untuk merencanakan, melaksanakan, dan mengevaluasi pembelajaran yang inovatif yang dituangkan dalam bentuk tulisan ilmiah atau poster.'},
  {kode:'KK2', kategori:'Keterampilan Khusus', deskripsi:'Menguasai dan mengaplikasikan konsep teoritis tentang Penelitian Pengembangan Matematika yang diperlukan untuk merencanakan, melaksanakan, dan mengevaluasi pembelajaran yang inovatif yang dituangkan dalam bentuk tulisan ilmiah atau poster.'},
  {kode:'KK3', kategori:'Keterampilan Khusus', deskripsi:'Menguasai dan mengaplikasikan konsep teoritis tentang Technopreneurship yang dituangkan dalam bentuk proposal penelitian atau publikasi ilmiah.'}
];

// ============ HEURISTIK CPL: kata kunci per kode CPL untuk draf awal pemetaan CPMK->CPL ============
// Draf hasil heuristik ini SELALU ditandai "perlu verifikasi" (cplNeedsReview) sampai dosen mengedit
// centang CPL secara manual di tab CPMK. Jika tidak ada kata kunci yang cocok, fallback ke seluruh
// CPL yang terpasang pada MK (aman, tapi tetap perlu diverifikasi dosen).
const CPL_KEYWORDS = {
  S1:  ['karakter','etika','moral','tanggung jawab','nilai islam','kemuhammadiyahan','integritas','religius'],
  PP1: ['pembelajaran','pedagogik','peserta didik','kependidikan','kualitas pembelajaran','kompetensi dasar'],
  PP2: ['matematika','keilmuan','iptek','konsep dasar','aljabar','kalkulus','analisis','geometri','statistik','teori bilangan','trigonometri'],
  PP3: ['desain pembelajaran','rencana pembelajaran','evaluasi pembelajaran','rpp','kurikulum','asesmen','perangkat ajar','inovatif'],
  KU1: ['studi lanjut','keahlian tambahan','kompetensi lanjutan'],
  KU2: ['penelitian','publikasi','kajian','metodologi','instrumen penelitian','artikel ilmiah','skripsi'],
  KU3: ['kewirausahaan','technopreneur','bisnis','start-up','pitching','model bisnis'],
  KK1: ['teknologi pendidikan','media pembelajaran','digital','perangkat lunak','software','geogebra'],
  KK2: ['penelitian pengembangan matematika','pengembangan matematika','riset matematika'],
  KK3: ['technopreneurship','proposal penelitian','publikasi ilmiah','wirausaha']
};
function suggestCplKodes(text, availableCplKodes){
  const t = (text||'').toLowerCase();
  const matched = availableCplKodes.filter(kode=>{
    const kws = CPL_KEYWORDS[kode] || [];
    return kws.some(kw=>t.includes(kw));
  });
  return matched.length>0 ? matched : [...availableCplKodes];
}

// ============ BAHAN KAJIAN BANK (Table 7) ============
const BK_BANK = {
  BK1:'Konsep dasar Aljabar Linear', BK2:'Penerapan & pemecahan masalah Aljabar Linear',
  BK3:'Konsep dasar Aljabar Matriks', BK4:'Penerapan & pemecahan masalah Aljabar Matriks',
  BK5:'Konsep dasar Analisis Real', BK6:'Teori & metode limit-konvergensi', BK7:'Aplikasi lanjut (kontinuitas, diferensial, integral)',
  BK8:'Konsep dasar Geometri Analitik', BK9:'Penerapan & pemecahan masalah Geometri Analitik',
  BK10:'Aksioma & postulat Euclid', BK11:'Teorema-teorema pokok (segitiga, lingkaran, poligon)', BK12:'Aplikasi lanjut & pembuktian konstruktif',
  BK13:'Transformasi isometri & kesebangunan', BK14:'Aplikasi transformasi (rotasi, refleksi, translasi, dilatasi)',
  BK15:'Limit, turunan & aturan diferensial', BK16:'Teorema-teorema nilai tengah & aplikasi laju perubahan', BK17:'Optimasi & pemodelan ilmiah',
  BK18:'Integral tak tentu & teknik pengintegralan', BK19:'Integral tentu & teorema dasar kalkulus', BK20:'Aplikasi luas, volume & pemodelan fisika',
  BK21:'Turunan parsial & gradien', BK22:'Integral lipat & integral garis/permukaan', BK23:'Teorema Green, Gauss & Stokes',
  BK24:'Tren konten matematika SMP/SMA', BK25:'Analisis kurikulum & kesesuaian kompetensi', BK26:'Inovasi strategi pembelajaran kontekstual',
  BK27:'Topik lanjut (statistika, kombinatorik, kalkulus lanjutan)', BK28:'Pengembangan soal HOTS & literasi numerasi', BK29:'Pendekatan STEAM di kelas atas',
  BK30:'Teori bunga majemuk & anuitas', BK31:'Model risiko & premi asuransi',
  BK32:'Logika, himpunan & fungsi diskrit', BK33:'Graf, pohon & aplikasi komputasi',
  BK34:'Aturan pencacahan & permutasi-kombinasi', BK35:'Probabilitas diskrit, kontinu & hukum besar bilangan',
  BK36:'Pendekatan numerik akar persamaan & interpolasi', BK37:'Integrasi & diferensiasi numerik serta analisis error',
  BK38:'Analisis komponen utama & faktor', BK39:'Analisis klaster & diskriminan', BK40:'Aplikasi paket statistik & interpretasi hasil',
  BK41:'Logika & pembuktian matematika', BK42:'Struktur dasar aljabar & sistem bilangan',
  BK43:'Metode orde-1 & orde-n linear', BK44:'Aplikasi model populasi & dinamika sistem',
  BK45:'Formulasi masalah optimasi linear', BK46:'Metode simpleks & analisis sensitivitas',
  BK47:'Sistem aksiomatik non-Euclid', BK48:'Geometri proyektif & afine', BK49:'Aplikasi transformasi geometri modern',
  BK50:'Definisi grup & subgroup', BK51:'Homomorfisme & teorema Lagrange',
  BK52:'Ring, ideal & faktor ring', BK53:'Aplikasi polinomial & modul',
  BK54:'Divisibilitas & kongruensi', BK55:'Teorema bilangan prima & kriptografi dasar',
  BK56:'Identitas & grafik fungsi trigonometri', BK57:'Aplikasi pemodelan gelombang & navigasi',
  BK58:'Prinsip evaluasi & asesmen formatif', BK59:'Penyusunan instrumen tes valid & reliabel',
  BK60:'Analisis hasil & tindak lanjut pembelajaran', BK61:'Filsafat & landasan kurikulum', BK62:'Pengembangan RPP & perangkat ajar',
  BK63:'Evaluasi implementasi kurikulum', BK64:'Desain media berbasis teori belajar', BK65:'Produksi media digital/interaktif',
  BK66:'Penilaian efektivitas media di kelas', BK67:'Kode etik guru & profesionalisme',
  BK68:'Isu hukum & tanggung jawab sosial', BK69:'Perencanaan mikro-lesson',
  BK70:'Observasi & refleksi praktik mengajar', BK71:'Perencanaan & organisasi sekolah',
  BK72:'Kepemimpinan, supervisi & akreditasi', BK73:'Analisis kebutuhan & tujuan belajar',
  BK74:'Penyusunan strategi, metode & asesmen',
  BK75:'Perancangan & demonstrasi alat peraga', BK76:'Isu miskonsepsi & kesulitan belajar',
  BK77:'Solusi inovatif & penelitian tindakan kelas', BK78:'Konsep matematika dalam budaya lokal',
  BK79:'Integrasi etnomatematika dalam kurikulum', BK80:'Kerangka & filosofi STEM Education',
  BK81:'Implementasi proyek berbasis STEM', BK82:'Teori Realistic Mathematics Education', BK83:'Design-Based Research dalam pendidikan matematika',
  BK84:'Landasan teoritik BK di sekolah', BK85:'Teknik konseling individual & kelompok',
  BK86:'Program layanan & evaluasi', BK87:'Teori belajar & motivasi siswa',
  BK88:'Perkembangan kognitif & implikasi instruksional', BK89:'Nilai-nilai keimanan & akhlak',
  BK90:'Etika sosial & toleransi', BK91:'Konsep tauhid & humanisme islam',
  BK92:'Praktik spiritualitas dalam kehidupan modern', BK93:'Fiqh ibadah harian',
  BK94:'Etika muamalah & ekonomi syariah', BK95:'Sejarah & dakwah Muhammadiyah',
  BK96:'Gerakan tajdid & filantropi', BK97:'Islam & perkembangan ilmu pengetahuan',
  BK98:'Etika teknologi & masa depan peradaban', BK99:'Pancasila & UUD 1945 sebagai ideologi',
  BK100:'Hak, kewajiban & bela negara', BK101:'Nilai-nilai dasar Pancasila',
  BK102:'Aktualisasi Pancasila dalam kebijakan publik', BK103:'Kaidah & ragam bahasa ilmiah',
  BK104:'Teknik penulisan karya akademik', BK105:'Academic reading & vocabulary',
  BK106:'Academic writing & presentation skills', BK107:'Pengantar filsafat ilmu',
  BK108:'Aliran utama & kritik epistemologi', BK109:'Penelusuran literatur & penulisan makalah',
  BK110:'Presentasi ilmiah & diskusi panel', BK111:'Paradigma & desain penelitian', BK112:'Teknik pengumpulan & analisis data',
  BK113:'Pengukuran tendensi sentral & dispersi', BK114:'Visualisasi data & interpretasi',
  BK115:'Uji hipotesis parametrik', BK116:'Analisis hubungan & perbandingan',
  BK117:'Estimasi parameter & interval kepercayaan', BK118:'Regresi, ANOVA & pengambilan keputusan',
  BK119:'Struktur artikel jurnal & etika sitasi', BK120:'Teknik penulisan & penggunaan reference manager', BK121:'Proses submit, review & revisi naskah',
  BK122:'Perumusan masalah & kajian literatur', BK123:'Landasan teori & kerangka penelitian', BK124:'Metodologi & desain instrumen',
  BK125:'Pengumpulan & analisis data', BK126:'Penulisan laporan akhir', BK127:'Presentasi & publikasi hasil penelitian',
  BK128:'Pengenalan GeoGebra/MATLAB/R untuk matematika', BK129:'Implementasi software pada pemecahan masalah',
  BK130:'Dasar-dasar perangkat keras & jaringan', BK131:'Aplikasi TI dalam pendidikan & riset',
  BK132:'Orientasi & pemetaan kebutuhan masyarakat', BK133:'Perencanaan program pengabdian', BK134:'Pelaksanaan kegiatan lapangan',
  BK135:'Monitoring & evaluasi dampak', BK136:'Pelaporan & diseminasi hasil',
  BK137:'Observasi budaya sekolah & kelas', BK138:'Praktik asistensi mengajar terbimbing',
  BK139:'Perencanaan unit pembelajaran penuh', BK140:'Praktik mengajar mandiri', BK141:'Penilaian & refleksi performa', BK142:'Pengembangan inovasi kelas',
  BK143:'Konsep SDGs & indikator global', BK144:'Strategi lokal implementasi SDG-4 (pendidikan)',
  BK145:'Model bisnis berbasis teknologi', BK146:'Validasi pasar & pitching start-up',
  BK147:'Dasar kebugaran & kesehatan jasmani', BK148:'Metode pengajaran olahraga di sekolah'
};

// ============ TAKSONOMI BLOOM / KKO (Table 8) ============
const KKO_BANK = {
  C1:{label:'Mengingat (C1)', verbs:['Mengenali','Mengingat kembali','Menyebutkan','Menuliskan','Menghafal']},
  C2:{label:'Memahami (C2)', verbs:['Menjelaskan','Menginterpretasikan','Merangkum','Menyimpulkan','Membandingkan','Mengklasifikasikan','Menguraikan','Mengidentifikasi']},
  C3:{label:'Menerapkan (C3)', verbs:['Melaksanakan','Mengimplementasikan','Menggunakan','Menentukan','Menerapkan','Memproseskan']},
  C4:{label:'Menganalisis (C4)', verbs:['Menganalisis','Mendiferensiasikan','Mengorganisasikan','Mendiagnosis','Memerinci','Menelaah','Mengaitkan','Memecahkan']},
  C5:{label:'Mengevaluasi (C5)', verbs:['Mengevaluasi','Mengecek','Mengkritik','Membuktikan','Mempertahankan','Memvalidasi','Memproyeksikan']},
  C6:{label:'Menciptakan (C6)', verbs:['Menyusun','Merancang','Membangun','Merencanakan','Memproduksi','Mengkombinasikan','Merekonstruksi','Menciptakan']}
};
// Standar harapan (kualifikasi capaian) per level Bloom — dipakai sebagai klausa penutup kalimat CPMK/Sub-CPMK
// (format: "Mahasiswa mampu [KKO] [materi] dengan [standar harapan]."), bisa diedit bebas oleh dosen di textarea.
const STANDAR_HARAPAN_BY_BLOOM = {
  C1:'tepat dan benar', C2:'tepat dan jelas', C3:'tepat dan sistematis',
  C4:'kritis dan sistematis', C5:'tepat dan objektif', C6:'kreatif dan inovatif'
};
function detectBloomLevel(text){
  const t = (text||'').toLowerCase();
  if(/rancang|desain|produksi|kembangkan|pengembangan|susun|penyusunan|ciptakan|konstruksi|rekonstruksi|rencana|perencanaan/.test(t)) return 'C6';
  if(/evaluasi|kritik|validasi|nilai|penilaian|buktikan|pembuktian|refleksi/.test(t)) return 'C5';
  if(/analisis|menganalisis|diagnosis|telaah|urai|deteksi|kaitkan|pemecahan masalah|memecahkan|hubungan|perbandingan/.test(t)) return 'C4';
  if(/terap|aplikasi|penerapan|implementasi|gunakan|praktik|latihan|hitung|teknik|metode|prosedur/.test(t)) return 'C3';
  if(/konsep dasar|pengertian|definisi|dasar|pengantar|prinsip|teori|identitas/.test(t)) return 'C2';
  return 'C2';
}
function kkoVerbFor(level, seedIdx){
  const arr = KKO_BANK[level].verbs;
  return arr[seedIdx % arr.length];
}
function lowerFirst(s){ return s ? s.charAt(0).toLowerCase()+s.slice(1) : s; }

// ============ JENIS EVALUASI sesuai KKO (riset: Constructive Alignment LOTS/MOTS/HOTS, Panduan Kurikulum OBE 2025) ============
// C1-C2 (LOTS/Recall & Comprehension) -> Kuis/tes objektif; C3 (MOTS/Apply) -> tugas penerapan;
// C4-C6 (HOTS/Analyze-Evaluate-Create) -> studi kasus, presentasi kritis, proyek/karya
const JENIS_EVALUASI_BY_BLOOM = {
  C1:'Kuis', C2:'Kuis', C3:'Tugas Latihan/Penerapan', C4:'Studi Kasus', C5:'Presentasi & Diskusi Kritis', C6:'Proyek/Karya Tulis'
};
const JENIS_EVALUASI_OPTIONS = ['Kuis','Tugas Latihan/Penerapan','Studi Kasus','Presentasi & Diskusi Kritis','Proyek/Karya Tulis','UTS','UAS'];

// ============ TEMPLATE RUBRIK per JENIS EVALUASI ============
const RUBRIK_TEMPLATES = {
  'Kuis': [{nama:'Ketepatan jawaban',bobot:70},{nama:'Kecepatan & ketelitian',bobot:30}],
  'Tugas Latihan/Penerapan': [{nama:'Ketepatan penerapan konsep/prosedur',bobot:50},{nama:'Ketepatan hasil akhir',bobot:30},{nama:'Sistematika pengerjaan',bobot:20}],
  'Studi Kasus': [{nama:'Ketepatan identifikasi masalah',bobot:25},{nama:'Kedalaman analisis',bobot:35},{nama:'Ketepatan solusi/kesimpulan',bobot:25},{nama:'Sistematika laporan',bobot:15}],
  'Presentasi & Diskusi Kritis': [{nama:'Penguasaan materi',bobot:30},{nama:'Kemampuan komunikasi',bobot:20},{nama:'Kualitas argumen/kritik',bobot:30},{nama:'Kemampuan menjawab',bobot:20}],
  'Proyek/Karya Tulis': [{nama:'Orisinalitas & inovasi',bobot:25},{nama:'Kedalaman konten',bobot:25},{nama:'Kualitas produk/karya',bobot:30},{nama:'Presentasi hasil',bobot:20}],
  'UTS': [{nama:'Ketepatan konsep',bobot:40},{nama:'Ketepatan penerapan',bobot:35},{nama:'Sistematika jawaban',bobot:25}],
  'UAS': [{nama:'Ketepatan konsep',bobot:30},{nama:'Ketepatan analisis',bobot:40},{nama:'Sistematika & kesimpulan',bobot:30}],
  'Tes': [{nama:'Ketepatan konsep',bobot:40},{nama:'Ketepatan penerapan',bobot:35},{nama:'Sistematika jawaban',bobot:25}],
  'Tugas Proyek': [{nama:'Orisinalitas & inovasi',bobot:25},{nama:'Kedalaman konten',bobot:25},{nama:'Kualitas produk/karya',bobot:30},{nama:'Presentasi hasil',bobot:20}]
};
// Jenis evaluasi untuk pertemuan UTS (8) & UAS (16) — dipilih bebas oleh dosen, mencakup seluruh Sub-CPMK pada rentangnya
const EXAM_JENIS_OPTIONS = ['Tes','Tugas Proyek'];

// ============ FAKTOR KOMPLEKSITAS untuk pembobotan otomatis (poin 2 revisi) ============
// Bobot mentah per Sub-CPMK = (jumlah pertemuan yang mencakup Sub-CPMK itu) x (faktor jenis evaluasi).
// Semakin tinggi tingkat kognitif (HOTS) jenis evaluasinya, semakin besar faktor -> semakin berat bobotnya per pertemuan.
const JENIS_COMPLEXITY_FACTOR = {
  'Kuis':1.0, 'Tugas Latihan/Penerapan':1.2, 'Studi Kasus':1.5, 'Presentasi & Diskusi Kritis':1.5,
  'Proyek/Karya Tulis':1.8, 'UTS':1.6, 'UAS':1.8, 'Tes':1.6, 'Tugas Proyek':1.8
};

// ============ SARAN OTOMATIS Bentuk & Metode Pembelajaran per level Bloom (poin 4 revisi) ============
const BENTUK_BY_BLOOM = {
  C1:'Kuliah', C2:'Kuliah', C3:'Kuliah, Latihan/Praktik', C4:'Kuliah, Diskusi Kelompok',
  C5:'Kuliah, Seminar/Presentasi', C6:'Kuliah, Praktikum/Proyek'
};
const METODE_BY_BLOOM = {
  C1:'Ceramah, Tanya Jawab', C2:'Ceramah, Tanya Jawab', C3:'Discovery Learning, Latihan Soal',
  C4:'Problem Based Learning, Diskusi', C5:'Case Method, Diskusi Kritis', C6:'Project Based Learning, Kolaboratif'
};
// Daftar baku (Permendikbud 3/2020) untuk pilihan manual di dropdown Bentuk & Metode
const BENTUK_STANDARD_OPTIONS = [
  'Kuliah','Responsi','Tutorial','Seminar/Presentasi','Praktikum','Praktik Studio',
  'Praktik Bengkel','Praktik Lapangan','Penelitian','Pengabdian Kepada Masyarakat'
];
const METODE_STANDARD_OPTIONS = [
  'Ceramah, Tanya Jawab','Small Group Discussion','Role-Play & Simulation','Discovery Learning',
  'Self-Directed Learning','Cooperative Learning','Collaborative Learning','Contextual Learning',
  'Problem Based Learning','Project Based Learning','Case Method'
];
function bentukOptionsFor(sub){
  const rec = sub ? (BENTUK_BY_BLOOM[sub.bloomLevel]||'Kuliah') : null;
  const list = [];
  if(rec) list.push(rec);
  BENTUK_STANDARD_OPTIONS.forEach(o=>{ if(!list.includes(o)) list.push(o); });
  return list;
}
function metodeOptionsFor(sub){
  const rec = sub ? (METODE_BY_BLOOM[sub.bloomLevel]||'Ceramah, Tanya Jawab') : null;
  const list = [];
  if(rec) list.push(rec);
  METODE_STANDARD_OPTIONS.forEach(o=>{ if(!list.includes(o)) list.push(o); });
  return list;
}
const AKTIVITAS_BY_JENIS = {
  'Kuis':'mengerjakan kuis dan mendiskusikan hasilnya',
  'Tugas Latihan/Penerapan':'mengerjakan latihan penerapan konsep secara mandiri/kelompok',
  'Studi Kasus':'menganalisis studi kasus dan menyusun laporan analisis',
  'Presentasi & Diskusi Kritis':'menyusun dan mempresentasikan hasil kajian serta berdiskusi kritis',
  'Proyek/Karya Tulis':'menyusun proyek/karya tulis secara kolaboratif',
  'UTS':'mengerjakan evaluasi tengah semester',
  'UAS':'mengerjakan evaluasi akhir semester',
  'Tes':'mengerjakan soal tes tertulis',
  'Tugas Proyek':'mengerjakan dan mengumpulkan tugas proyek'
};

// ============ DESKRIPTOR RUBRIK (skala 1-5, kriteria-referensi sesuai pedoman penyusunan rubrik) ============
const RUBRIK_LEVEL_LABEL = {1:'Sangat Kurang',2:'Kurang',3:'Cukup',4:'Baik',5:'Sangat Baik'};
function genDeskriptorLevels(aspekNama){
  const a = lowerFirst(aspekNama||'aspek ini');
  return {
    5:`Menunjukkan ${a} secara sangat tepat, lengkap, dan konsisten tanpa kekurangan berarti.`,
    4:`Menunjukkan ${a} dengan tepat dan cukup lengkap, hanya ada kekurangan minor.`,
    3:`Menunjukkan ${a} secara memadai, namun ada beberapa bagian yang kurang tepat/lengkap.`,
    2:`Menunjukkan ${a} secara sebagian, dengan beberapa kekurangan yang berarti.`,
    1:`Belum menunjukkan ${a} secara memadai; sebagian besar tidak tepat/tidak lengkap.`
  };
}
function genPengalamanBelajar(sub, ev, metode){
  // Deskripsi mencakup: KKO (kata kerja Sub-CPMK) + materi + metode + hasil/capaian
  const verbMatch = (sub.deskripsi||'').match(/^Mahasiswa\s+mampu\s+(\S+)/i);
  const verb = verbMatch ? lowerFirst(verbMatch[1]) : 'mempelajari';
  const aktivitas = AKTIVITAS_BY_JENIS[ev?ev.jenisEvaluasi:'']||'berdiskusi dan berlatih';
  const materi = sub.materi || 'materi terkait';
  const metodeText = metode ? lowerFirst(metode) : 'metode yang relevan';
  const hasil = sub.deskripsi ? 'kemampuan '+coreKemampuanText(sub.deskripsi) : 'kemampuan yang ditetapkan pada Sub-CPMK ini';
  return `Mahasiswa ${verb} ${materi} melalui ${metodeText}, dengan ${aktivitas}, sebagai wujud pencapaian ${hasil}.`;
}
// Ambil inti "verb + materi" dari kalimat CPMK/Sub-CPMK, membuang prefiks "Mahasiswa mampu" dan
// klausa standar harapan penutup ("... dengan tepat dan jelas."), untuk disisipkan ke kalimat lain.
function coreKemampuanText(deskripsi){
  let t = (deskripsi||'').replace(/^Mahasiswa\s+mampu\s+/i,'');
  t = t.replace(/\s+dengan\s+[^.]*\.?\s*$/i,'');
  t = t.replace(/\.$/,'');
  return t || 'yang ditetapkan pada Sub-CPMK ini';
}
function genIndikator(sub){
  const verb = (sub.deskripsi||'').match(/^Mahasiswa\s+mampu\s+(\S+)/i);
  return `Ketepatan ${verb?lowerFirst(verb[1]):'menunjukkan pemahaman'} ${sub.materi||'materi terkait'}`;
}
function genKriteria(ev){
  const tmpl = RUBRIK_TEMPLATES[ev?ev.jenisEvaluasi:''] || RUBRIK_TEMPLATES['Kuis'];
  return tmpl.map(t=>t.nama).join(', ');
}

// ============ UTS (pertemuan 8) & UAS (pertemuan 16): evaluasi komprehensif lintas Sub-CPMK ============
// UTS otomatis mencakup seluruh Sub-CPMK pada pertemuan 1-7, UAS mencakup seluruh Sub-CPMK pada pertemuan 9-15.
// Jenis evaluasinya (Tes / Tugas Proyek) dipilih bebas oleh dosen di tab Rencana Evaluasi.
function examWeekRange(type){ return type==='UTS' ? [1,7] : [9,15]; }
function coveredSubCpmkIds(type){
  const [a,b] = examWeekRange(type);
  const ids = [];
  state.weeks.forEach(w=>{ if(w.minggu>=a && w.minggu<=b && w.subCpmkId && !ids.includes(w.subCpmkId)) ids.push(w.subCpmkId); });
  return ids;
}
function subLabelList(ids){
  return ids.map(id=>{ const si=state.subCpmk.findIndex(s=>s.id===id); return si>=0?('Sub'+(si+1)):null; }).filter(Boolean);
}
function genMateriExam(coveredIds){
  const list = coveredIds.map(id=>{ const s=state.subCpmk.find(x=>x.id===id); return s&&s.materi?s.materi:null; }).filter(Boolean);
  return list.length ? list.join('; ') : '(belum ada materi pada rentang pertemuan ini)';
}
function genPengalamanExam(type, jenisEvaluasi, coveredIds){
  const label = type==='UTS' ? 'Ujian Tengah Semester (UTS)' : 'Ujian Akhir Semester (UAS)';
  const aktivitas = AKTIVITAS_BY_JENIS[jenisEvaluasi] || 'mengerjakan evaluasi';
  const subNums = subLabelList(coveredIds);
  return `Mahasiswa ${aktivitas} sebagai bentuk ${label}${subNums.length?', mencakup '+subNums.join(', '):''}.`;
}
function genIndikatorExam(type, coveredIds){
  const label = type==='UTS' ? 'tengah semester' : 'akhir semester';
  const materiList = coveredIds.map(id=>{ const s=state.subCpmk.find(x=>x.id===id); return s?s.materi:null; }).filter(Boolean);
  return `Ketepatan menyelesaikan evaluasi ${label}${materiList.length?' yang mencakup '+materiList.join(', '):''}`;
}
function examEvalId(type){ return 'exam-'+type.toLowerCase(); }
function generateRubrikForExam(ev){
  const template = RUBRIK_TEMPLATES[ev.jenisEvaluasi] || RUBRIK_TEMPLATES['Tes'];
  const covered = coveredSubCpmkIds(ev.examType);
  const subNums = subLabelList(covered);
  const existing = state.rubrik.find(r=>r.linkedSubCpmkId===ev.id);
  const oldAspectByNama = {};
  if(existing) existing.aspects.forEach(a=>{ oldAspectByNama[a.nama]=a; });
  const newRubrik = {
    id: existing ? existing.id : uid(),
    nama: `${ev.examType} — ${ev.jenisEvaluasi}${subNums.length?' (mencakup '+subNums.join(', ')+')':''}`,
    aspects: template.map(t=>{ const old=oldAspectByNama[t.nama]; return old?old:{id:uid(),nama:t.nama,bobot:t.bobot,deskriptor:genDeskriptorLevels(t.nama)}; }),
    subjek: existing ? existing.subjek : [],
    skorByStudent: existing ? (existing.skorByStudent||{}) : {},
    linkedSubCpmkId: ev.id
  };
  if(existing){ state.rubrik[state.rubrik.findIndex(r=>r.id===existing.id)] = newRubrik; }
  else { state.rubrik.push(newRubrik); }
}
function ensureExamEvaluasi(){
  if(state.subCpmk.length===0){
    const hadExam = state.evaluasi.some(e=>e.examType);
    state.evaluasi = state.evaluasi.filter(e=>!e.examType);
    if(hadExam) state.rubrik = state.rubrik.filter(r=>r.linkedSubCpmkId!==examEvalId('UTS') && r.linkedSubCpmkId!==examEvalId('UAS'));
    return;
  }
  ['UTS','UAS'].forEach(type=>{
    const id = examEvalId(type);
    let ev = state.evaluasi.find(e=>e.id===id);
    if(!ev){
      ev = {id, subCpmkId:'', examType:type, jenisEvaluasi:'Tes', bobot:'', deskripsi:''};
      state.evaluasi.push(ev);
    }
    generateRubrikForExam(ev);
  });
}

// ============ MATA KULIAH BANK (Table 9 & 10: MK + CPL + Bahan Kajian) ============
const MATA_KULIAH_BANK = [
  {kode:'2500A01A',nama:'Agama',sks:2,semester:1,cpl:['S1','PP1','KU1','KK1'],bk:['BK88','BK89']},
  {kode:'2500A02A',nama:'Pancasila',sks:2,semester:1,cpl:['S1','PP2','KU2','KK2'],bk:['BK100','BK101']},
  {kode:'2501A01A',nama:'Filsafat',sks:2,semester:1,cpl:['S1','PP2','KU2','KK2'],bk:['BK106','BK107']},
  {kode:'2500A06A',nama:'AIK I (Kemanusiaan dan Keimanan)',sks:2,semester:1,cpl:['S1','PP1','KU1','KK1'],bk:['BK90','BK91']},
  {kode:'2503F16A',nama:'Pengantar Dasar Matematika',sks:2,semester:1,cpl:['S1','PP2','KU2','KK2'],bk:['BK41','BK42']},
  {kode:'2503F04A',nama:'Geometri Analitik',sks:2,semester:1,cpl:['S1','PP2','KU2','KK2'],bk:['BK8','BK9']},
  {kode:'2503E02A',nama:'Etika Profesi Keguruan',sks:2,semester:1,cpl:['S1','PP1','KU1','KK1'],bk:['BK66','BK67']},
  {kode:'2503E01A',nama:'Bimbingan dan Konseling',sks:3,semester:1,cpl:['S1','PP1','KU1','KK1'],bk:['BK84','BK85']},
  {kode:'2503E05A',nama:'Kapita Selekta Matematika Pendidikan Menengah',sks:3,semester:1,cpl:['S1','PP2','KU2','KK2'],bk:['BK24','BK25','BK26']},
  {kode:'2500A03A',nama:'Kewarganegaraan',sks:2,semester:2,cpl:['S1','PP1','KU3','KK3'],bk:['BK98','BK99']},
  {kode:'2500A04A',nama:'Bahasa Indonesia',sks:2,semester:2,cpl:['S1','PP2','KU2','KK2'],bk:['BK102','BK103']},
  {kode:'2500A07A',nama:'AIK II (Ibadah, Akhlak dan Muamalat)',sks:2,semester:2,cpl:['S1','PP1','KU1','KK1'],bk:['BK92','BK93']},
  {kode:'2501A02A',nama:'Bahasa Inggris',sks:2,semester:2,cpl:['S1','PP2','KU2','KK2'],bk:['BK104','BK105']},
  {kode:'2503F01A',nama:'Aljabar Linear',sks:2,semester:2,cpl:['S1','PP2','KU2','KK2'],bk:['BK1','BK2']},
  {kode:'2503F07A',nama:'Kalkulus Diferensial',sks:3,semester:2,cpl:['S1','PP2','KU2','KK2'],bk:['BK15','BK16','BK17']},
  {kode:'2503F23A',nama:'Statistik Deskriptif',sks:2,semester:2,cpl:['S1','PP3','KU3','KK3'],bk:['BK113','BK114']},
  {kode:'2503F28A',nama:'Teori Bilangan',sks:2,semester:2,cpl:['S1','PP2','KU2','KK2'],bk:['BK54','BK55']},
  {kode:'2503F02A',nama:'Aljabar Matriks',sks:2,semester:2,cpl:['S1','PP2','KU2','KK2'],bk:['BK3','BK4']},
  {kode:'2503F06A',nama:'Geometri Transformasi',sks:2,semester:2,cpl:['S1','PP2','KU2','KK2'],bk:['BK13','BK14']},
  {kode:'2500A05A',nama:'Teknologi Informasi',sks:2,semester:3,cpl:['S1','PP3','KU3','KK3'],bk:['BK130','BK131']},
  {kode:'2500A08A',nama:'AIK III (Kemuhammadiyahan)',sks:2,semester:3,cpl:['S1','PP1','KU1','KK1'],bk:['BK94','BK95']},
  {kode:'2501A03A',nama:'Pembangunan Berkelanjutan (SDGs)',sks:2,semester:3,cpl:['S1','PP3','KU3','KK3'],bk:['BK143','BK144']},
  {kode:'2503F08A',nama:'Kalkulus Integral',sks:3,semester:3,cpl:['S1','PP2','KU2','KK2'],bk:['BK18','BK19','BK20']},
  {kode:'2503F10A',nama:'Kajian Stem',sks:2,semester:3,cpl:['S1','PP1','KU1','KK1'],bk:['BK79','BK80']},
  {kode:'2503F21A',nama:'RME dan Kajian DDR',sks:2,semester:3,cpl:['S1','PP1','KU1','KK1'],bk:['BK81','BK82','BK83']},
  {kode:'2503F27A',nama:'Sistem Geometri',sks:3,semester:3,cpl:['S1','PP2','KU2','KK2'],bk:['BK47','BK48','BK49']},
  {kode:'2503F29A',nama:'Trigonometri',sks:2,semester:3,cpl:['S1','PP2','KU2','KK2'],bk:['BK56','BK57']},
  {kode:'2503E10A',nama:'Psikologi Pendidikan',sks:2,semester:3,cpl:['S1','PP1','KU1','KK1'],bk:['BK86','BK87']},
  {kode:'2503F17A',nama:'Persamaan Differensial Biasa',sks:2,semester:3,cpl:['S1','PP2','KU2','KK2'],bk:['BK43','BK44']},
  {kode:'2500A09A',nama:'AIK IV (Islam, Ilmu Pengetahuan dan Teknologi)',sks:2,semester:4,cpl:['S1','PP1','KU1','KK1'],bk:['BK96','BK97']},
  {kode:'2500A10A',nama:'Technopreneurship',sks:2,semester:4,cpl:['S1','PP3','KU3','KK3'],bk:['BK145','BK146']},
  {kode:'2501A04A',nama:'Pendidikan Olahraga',sks:2,semester:4,cpl:['S1','PP3','KU3','KK3'],bk:['BK147','BK148']},
  {kode:'2503F15A',nama:'Peluang dan Kombinatorik',sks:2,semester:4,cpl:['S1','PP2','KU2','KK2'],bk:['BK34','BK35']},
  {kode:'2503F25A',nama:'Struktur Aljabar Grup',sks:2,semester:4,cpl:['S1','PP2','KU2','KK2'],bk:['BK50','BK51']},
  {kode:'2503F24A',nama:'Statistik Penelitian Pendidikan',sks:2,semester:4,cpl:['S1','PP3','KU3','KK3'],bk:['BK115','BK116']},
  {kode:'2503E04A',nama:'Kapita Selekta Matematika Pendidikan Atas',sks:3,semester:4,cpl:['S1','PP2','KU2','KK2'],bk:['BK27','BK28','BK29']},
  {kode:'2503F20A',nama:'Program Linear',sks:2,semester:4,cpl:['S1','PP2','KU2','KK2'],bk:['BK45','BK46']},
  {kode:'2503F05A',nama:'Geometri Euclidean',sks:3,semester:4,cpl:['S1','PP2','KU2','KK2'],bk:['BK10','BK11','BK12']},
  {kode:'2503F12A',nama:'Matematika Diskrit',sks:2,semester:4,cpl:['S1','PP2','KU2','KK2'],bk:['BK32','BK33']},
  {kode:'2501A06A',nama:'Praktik Pengalaman Lapangan 1',sks:2,semester:5,cpl:['S1','PP3','KU3','KK3'],bk:['BK137','BK138']},
  {kode:'2503E08A',nama:'Perencanaan Pembelajaran Matematika',sks:2,semester:5,cpl:['S1','PP1','KU1','KK1'],bk:['BK72','BK73']},
  {kode:'2503E09A',nama:'Problematika Pendidikan Matematika',sks:2,semester:5,cpl:['S1','PP1','KU1','KK1'],bk:['BK75','BK76']},
  {kode:'2503D05A',nama:'Pengelolaan dan Manajemen Pendidikan',sks:2,semester:5,cpl:['S1','PP1','KU1','KK1'],bk:['BK70','BK71']},
  {kode:'2503D01A',nama:'Evaluasi Pembelajaran Matematika',sks:3,semester:5,cpl:['S1','PP1','KU1','KK1'],bk:['BK58','BK59']},
  {kode:'2503F22A',nama:'Statistika Inferensia',sks:2,semester:5,cpl:['S1','PP3','KU3','KK3'],bk:['BK117','BK118']},
  {kode:'2503F09A',nama:'Kalkulus Peubah Banyak',sks:3,semester:5,cpl:['S1','PP2','KU2','KK2'],bk:['BK21','BK22','BK23']},
  {kode:'2503F26A',nama:'Struktur Aljabar Ring',sks:2,semester:5,cpl:['S1','PP2','KU2','KK2'],bk:['BK52','BK53']},
  {kode:'2503D02A',nama:'Kurikulum dan Pembelajaran',sks:3,semester:5,cpl:['S1','PP1','KU1','KK1'],bk:['BK60','BK61','BK62']},
  {kode:'2501A05A',nama:'Metodologi Penelitian',sks:2,semester:6,cpl:['S1','PP3','KU3','KK3'],bk:['BK110','BK111','BK112']},
  {kode:'2503E03A',nama:'Kajian Etnomatematika',sks:2,semester:6,cpl:['S1','PP1','KU1','KK1'],bk:['BK77','BK78']},
  {kode:'2503D03A',nama:'Media Pembelajaran',sks:3,semester:6,cpl:['S1','PP1','KU1','KK1'],bk:['BK63','BK64','BK65']},
  {kode:'2503F14A',nama:'Metode Statistik Multivariat',sks:3,semester:6,cpl:['S1','PP2','KU2','KK2'],bk:['BK38','BK39','BK40']},
  {kode:'2503F19A',nama:'Praktikum Software Matematika',sks:2,semester:6,cpl:['S1','PP3','KU3','KK3'],bk:['BK128','BK129']},
  {kode:'2503F18A',nama:'Praktik Alat Peraga Matematika',sks:1,semester:6,cpl:['S1','PP1','KU1','KK1'],bk:['BK74']},
  {kode:'2503F03A',nama:'Analisis Real',sks:3,semester:6,cpl:['S1','PP2','KU2','KK2'],bk:['BK5','BK6','BK7']},
  {kode:'2503F13A',nama:'Metode Numerik',sks:2,semester:6,cpl:['S1','PP2','KU2','KK2'],bk:['BK36','BK37']},
  {kode:'2503E06A',nama:'Keterampilan Menulis dan Publikasi Ilmiah',sks:3,semester:6,cpl:['S1','PP3','KU3','KK3'],bk:['BK119','BK120','BK121']},
  {kode:'2503E07A',nama:'Seminar Pendidikan Matematika',sks:2,semester:6,cpl:['S1','PP2','KU2','KK2'],bk:['BK108','BK109']},
  {kode:'2500A11A',nama:'Kuliah Kerja Nyata',sks:5,semester:7,cpl:['S1','PP3','KU3','KK3'],bk:['BK132','BK133','BK134','BK135','BK136']},
  {kode:'2501A07A',nama:'Praktik Pengalaman Lapangan 2',sks:4,semester:7,cpl:['S1','PP3','KU3','KK3'],bk:['BK139','BK140','BK141','BK142']},
  {kode:'2503D04A',nama:'Micro Teaching',sks:2,semester:7,cpl:['S1','PP1','KU1','KK1'],bk:['BK68','BK69']},
  {kode:'2503F11A',nama:'Matematika Aktuaria',sks:2,semester:7,cpl:['S1','PP2','KU2','KK2'],bk:['BK30','BK31']},
  {kode:'2503E01E',nama:'Skripsi',sks:6,semester:8,cpl:['S1','PP3','KU3','KK3'],bk:['BK122','BK123','BK124','BK125','BK126','BK127']}
];

let state = {
  identitas:{
    universitas:'Universitas Muhammadiyah Kuningan', fakultas:'Fakultas Pendidikan Sosial dan Teknologi', prodi:'Pendidikan Matematika',
    kodeMK:'', namaMK:'', sks:'', semester:'', tglRevisi:'',
    dosenPengembangRPS:'', koordinatorRumpun:'', ketuaProdi:'', teamTeaching:'', prasyarat:'',
    deskripsiSingkat:'', pokokBahasan:'', mediaPembelajaran:''
  },
  cplSelected:[],
  bkAssigned:[],
  cpmk:[],
  subCpmk:[],
  referensi:[],
  weeks:[],
  evaluasi:[],
  threshold:65,
  mahasiswa:[],
  gradingScale:[
    {id:uid(),hm:'A',sm:'Istimewa',min:85,max:100,am:4.0},
    {id:uid(),hm:'AB',sm:'Sangat Baik',min:80,max:84.99,am:3.5},
    {id:uid(),hm:'B',sm:'Baik',min:70,max:79.99,am:3.0},
    {id:uid(),hm:'BC',sm:'Cukup Baik',min:60,max:69.99,am:2.5},
    {id:uid(),hm:'C',sm:'Cukup',min:56,max:59.99,am:2.0},
    {id:uid(),hm:'D',sm:'Kurang',min:40,max:55.99,am:1.0},
    {id:uid(),hm:'E',sm:'Gagal',min:0,max:39.99,am:0}
  ],
  rubrik:[]
};
for(let i=1;i<=16;i++){
  state.weeks.push({minggu:i,subCpmkId:'',materi:'',bentuk:'',metode:'',bentukManual:false,metodeManual:false,pengalaman:'',indikator:'',kriteria:''});
}

