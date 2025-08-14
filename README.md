# Aplikasi Chat Real-Time

## Deskripsi
Aplikasi chat real-time yang dibangun menggunakan Next.js dan Socket.io. Aplikasi ini memungkinkan pengguna untuk membuat dan bergabung ke room, serta bertukar pesan secara real-time tanpa menyimpan data di database. Semua pesan hilang saat halaman di-refresh.

## Fitur Utama
- Real-time messaging dengan Socket.io
- Sistem room/group
- Multi-user support dalam room yang sama
- Invite link generation dan sharing
- Responsif dan user-friendly
- Desain modern dengan Tailwind CSS

## Teknologi yang Digunakan
- **Next.js 15+** dengan TypeScript
- **Socket.io** untuk komunikasi real-time
- **Tailwind CSS** untuk styling modern
- **React Hooks** untuk manajemen state
- **Web APIs** (Clipboard, Share)

## Instalasi
1. Clone repositori ini:
   ```bash
   git clone <repository-url>
   ```
2. Masuk ke direktori proyek:
   ```bash
   cd <project-directory>
   ```
3. Install dependensi:
   ```bash
   npm install
   ```

## Cara Menggunakan
1. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
2. Buka aplikasi di browser Anda di `http://localhost:8000`.
3. Masukkan nama dan nama room untuk mulai chat.

## Kontribusi
Kontribusi sangat diterima! Silakan buka issue atau kirim pull request untuk perbaikan atau fitur baru.

## Lisensi
Proyek ini dilisensikan di bawah MIT License.
