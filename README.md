# Peta Perjalanan Hidup

Tandai kota tempat kamu lahir, sekolah, kuliah, bekerja, dan tinggal. Halaman ini menyambungkannya menjadi satu rute di bola dunia dan menghitung seberapa jauh hidup sudah membawamu.

## Fitur

- Pencarian sekitar 172 ribu kota dan kecamatan di seluruh dunia, atau tandai titik langsung di peta.
- Bola dunia yang bisa diputar, dengan pilihan peta datar.
- Pemutaran perjalanan dari kota ke kota dan penggeser tahun.
- Total jarak, perbandingan dengan Sabang–Merauke dan keliling bumi, tempat terlama, perpindahan terjauh, dan titik "pusat hidup".
- Kartu ringkasan berbentuk gambar.

Data perjalanan hanya disimpan di browser pengguna (`localStorage`). Tidak ada server dan tidak ada database.

## Menjalankan

Halaman memuat `kota-dunia.txt` dengan `fetch`, jadi harus dibuka lewat server, bukan dengan klik dua kali pada file.

```bash
npx serve .
```

Untuk GitHub Pages: buka Settings → Pages, pilih branch `main` dan folder `/ (root)`.

## Isi repo

| File | Keterangan |
|---|---|
| `index.html` | Halaman lengkap: HTML, CSS, dan JavaScript dalam satu file. |
| `kota-dunia.txt` | Data kota. Satu baris per tempat: `nama\|kode negara\|kode provinsi\|lintang\|bujur`, diurutkan dari penduduk terbanyak. |
| `peta-perjalanan-hidup.html` | Versi yang sama tanpa kerangka `<html>`, dipakai untuk Artifact di claude.ai. |

`index.html` dan `peta-perjalanan-hidup.html` berisi kode yang sama. Kalau salah satunya diubah, yang lain perlu disamakan.

## Sumber data dan pustaka

- Nama dan koordinat kota: [GeoNames](https://www.geonames.org/) `cities1000`, lisensi CC BY 4.0.
- Garis daratan: Natural Earth, lewat paket [datamaps](https://github.com/markmarkoh/datamaps).
- Peta dan proyeksi: [D3](https://d3js.org/) dan [TopoJSON](https://github.com/topojson/topojson), dimuat dari cdnjs.

Jarak dihitung sebagai garis lurus di permukaan bumi antara dua tempat yang berurutan, bukan jarak jalan.
