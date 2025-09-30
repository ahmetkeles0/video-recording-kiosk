# 🎬 Video Recording Kiosk

Modern, kullanıcı dostu video kayıt kiosk sistemi. iPad ile kontrol, iPhone ile kayıt, QR kod ile paylaşım.

## 🚀 Özellikler

- **📱 Tablet Interface**: iPad ile kayıt kontrolü
- **📹 Phone Interface**: iPhone ile video kayıt
- **🔗 Real-time Communication**: Socket.IO ile anlık iletişim
- **☁️ Cloud Storage**: Supabase ile güvenli depolama
- **📱 QR Code**: Anında paylaşım için QR kod
- **🎥 Video Preview**: Kayıt sırasında canlı önizleme
- **📤 Share API**: Native paylaşım desteği

## 🏗️ Proje Yapısı

```
video-recording-kiosk/
├── backend/                 # Node.js + Express + Socket.IO
│   ├── src/
│   │   └── index.ts         # Ana server dosyası
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # React + TypeScript
│   ├── src/
│   │   ├── components/      # UI bileşenleri
│   │   ├── hooks/          # Custom hooks
│   │   └── types.ts        # TypeScript tipleri
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 🛠️ Teknolojiler

### Backend
- **Node.js** + **Express**
- **Socket.IO** (WebSocket)
- **TypeScript**
- **CORS** desteği

### Frontend
- **React** + **TypeScript**
- **Vite** (Build tool)
- **Socket.IO Client**
- **QR Code** generation
- **MediaRecorder API**

### Cloud
- **Supabase** (Storage)
- **Public bucket** (video-kiosk)

## 📦 Kurulum

### 1. Repository'yi klonlayın
```bash
git clone https://github.com/ahmetkeles0/video-recording-kiosk.git
cd video-recording-kiosk
```

### 2. Tüm bağımlılıkları yükleyin
```bash
npm run install:all
```

### 3. Environment dosyalarını oluşturun

#### Backend (.env)
```bash
cd backend
cp env.example .env
```

#### Frontend (.env)
```bash
cd frontend
cp env.example .env
```

### 4. Supabase yapılandırması
- Supabase projesi oluşturun
- `video-kiosk` bucket'ı oluşturun (public)
- Environment değişkenlerini güncelleyin

## 🚀 Çalıştırma

### Development
```bash
# Tüm servisleri başlat
npm run dev

# Veya ayrı ayrı
npm run dev:backend    # Backend (port 3000)
npm run dev:frontend    # Frontend (port 5173)
```

### Production
```bash
# Build
npm run build

# Backend
cd backend && npm start

# Frontend
cd frontend && npm run preview
```

## 📱 Kullanım

### 1. Tablet Interface (iPad)
- **URL**: `http://localhost:5173`
- **Özellikler**:
  - Kayıt başlatma
  - QR kod görüntüleme
  - URL kopyalama
  - Yeni kayıt başlatma

### 2. Phone Interface (iPhone)
- **URL**: `http://localhost:5173/record`
- **Özellikler**:
  - Otomatik kayıt başlatma
  - Canlı video önizleme
  - 15 saniye otomatik durma
  - Video yükleme

### 3. Watch Interface (Paylaşım)
- **URL**: `http://localhost:5173/watch?url=VIDEO_URL`
- **Özellikler**:
  - Video oynatma
  - Paylaşım (Web Share API)
  - İndirme
  - QR kod ile erişim

## 🔧 Yapılandırma

### Backend (.env)
```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
FRONTEND_TABLET_URL=http://localhost:5173
FRONTEND_PHONE_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:3000
```

## 🌐 Deploy

### Backend (Render)
1. GitHub repository'yi bağlayın
2. Build command: `cd backend && npm install && npm run build`
3. Start command: `cd backend && npm start`
4. Environment variables ekleyin

### Frontend (Vercel)
1. GitHub repository'yi bağlayın
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Environment variables ekleyin

## 📋 API Endpoints

### Socket.IO Events
- `device-register`: Cihaz kaydı
- `start-record`: Kayıt başlatma
- `recording-ready`: Kayıt hazır
- `video-uploaded`: Video yüklendi

### HTTP Endpoints
- `GET /`: Health check
- `GET /api/health`: System status

## 🎯 Özellikler

### Video Kayıt
- **Format**: MP4 (H.264) / WebM
- **Süre**: 15 saniye (otomatik)
- **Çözünürlük**: Cihaz destekli
- **Codec**: H.264 / VP8/VP9

### Paylaşım
- **QR Code**: Anında erişim
- **Web Share API**: Native paylaşım
- **URL**: Manuel kopyalama
- **Download**: Direkt indirme

### Güvenlik
- **CORS**: Yapılandırılmış
- **HTTPS**: Production'da zorunlu
- **Environment**: Güvenli değişkenler

## 🐛 Sorun Giderme

### Kamera Erişimi
- HTTPS kullanın (production)
- Kamera izinlerini kontrol edin
- Diğer uygulamaları kapatın

### Socket.IO Bağlantısı
- Backend URL'ini kontrol edin
- CORS ayarlarını doğrulayın
- Network bağlantısını test edin

### Video Upload
- Supabase yapılandırmasını kontrol edin
- Bucket permissions'ları doğrulayın
- Environment variables'ları kontrol edin

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

- **GitHub**: [@ahmetkeles0](https://github.com/ahmetkeles0)
- **Repository**: [video-recording-kiosk](https://github.com/ahmetkeles0/video-recording-kiosk)

---

⭐ **Star** vererek projeyi destekleyin!