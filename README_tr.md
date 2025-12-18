<div align="center">
  <h1>🤖 Sef - Yapay Zeka Sohbet Platformu</h1>
  <p><strong>Çoklu sağlayıcı desteğine sahip, kurumsal düzeyde RAG destekli agentic iş akışı sohbet platformu</strong></p>
  
  [![Lisans](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)
  [![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)](https://go.dev/)
  [![Next.js](https://img.shields.io/badge/Next.js-16.0+-000000?logo=next.js)](https://nextjs.org/)
  [![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
</div>

---

## 📋 İçindekiler

- [Genel Bakış](#-genel-bakış)
- [Ekran Görüntüleri](#-ekran-görüntüleri)
- [Temel Özellikler](#-temel-özellikler)
- [Mimari](#-mimari)
- [Kullanılan Teknolojiler](#-kullanılan-teknolojiler)
- [Başlangıç](#-başlangıç)
- [Yapılandırma](#-yapılandırma)
- [Detaylı Özellikler](#-detaylı-özellikler)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Geliştirme](#-geliştirme)
- [Dağıtım](#-dağıtım)
- [Katkıda Bulunma](#-katkıda-bulunma)
- [Lisans](#-lisans)

---

## 🎯 Genel Bakış

**Sef**, Bilgi Getirme-Destekli Üretim (RAG) gücünü esnek çoklu sağlayıcı desteği ve agentic araç kullanım sistemi ile birleştiren modern, kurumsal düzeyde bir yapay zeka sohbet platformudur. Go ve Next.js ile geliştirilmiş olup, akıllı konuşma yapay zeka sistemleri dağıtmak isteyen kuruluşlar için ölçeklenebilir bir çözüm sunar.

### Neden Sef?

- **🤖 Agentic Yapay Zeka Sistemi**: Gerçek zamanlı akışla çok turlu araç kullanımı - karmaşık problemleri otomatik olarak çözer
- **🔐 Kurumsal Kimlik Doğrulama**: Güvenli SSO için yerleşik Keycloak entegrasyonu
- **📚 Akıllı Doküman İşleme**: Hibrit arama (semantik + anahtar kelime) ile gelişmiş RAG
- **🔄 Çoklu Sağlayıcı Desteği**: OpenAI, Ollama ve vLLM arasında sorunsuzca geçiş yapın
- **🛠️ Araç Entegrasyonu**: Web arama, doküman analizi ve özel araç çalıştırma
- **🪟 Gömülebilir Widget'lar**: Harici web siteleri için kullanıma hazır sohbet widget'ları
- **🌍 Uluslararasılaştırma**: Tam i18n desteği (İngilizce, Türkçe)
- **📊 Analitik**: Kapsamlı oturum takibi ve analitik
- **🎨 Modern Arayüz**: shadcn/ui ile oluşturulmuş güzel, duyarlı arayüz

---

## 📸 Ekran Görüntüleri

<div align="center">
  <img src="docs/images/2.png" alt="Sohbet Arayüzü" width="100%">
  <p><em>Sohbet Arayüzü</em></p>
</div>

### Galeri

<div align="center">
  <table>
    <tr>
      <td width="33%">
        <img src="docs/images/1.png" alt="Ana Sayfa" width="100%">
        <p align="center"><em>Ana Sayfa</em></p>
      </td>
      <td width="33%">
        <img src="docs/images/3.png" alt="Ayarlar Sayfası" width="100%">
        <p align="center"><em>Ayarlar Sayfası</em></p>
      </td>
      <td width="33%">
        <img src="docs/images/4.png" alt="Sağlayıcı Ayarları" width="100%">
        <p align="center"><em>Sağlayıcı Ayarları</em></p>
      </td>
    </tr>
    <tr>
      <td width="33%">
        <img src="docs/images/5.png" alt="Chatbot Yapılandırması" width="100%">
        <p align="center"><em>Chatbot Yapılandırması</em></p>
      </td>
      <td width="33%">
        <img src="docs/images/6.png" alt="RAG Yönetimi" width="100%">
        <p align="center"><em>RAG Yönetimi</em></p>
      </td>
      <td width="33%">
        <img src="docs/images/7.png" alt="Oturum Kayıtları" width="100%">
        <p align="center"><em>Oturum Kayıtları</em></p>
      </td>
    </tr>
    <tr>
      <td width="33%">
        <img src="docs/images/8.png" alt="Gömme Ayarları" width="100%">
        <p align="center"><em>Gömme Ayarları</em></p>
      </td>
      <td width="33%">
        <img src="docs/images/9.png" alt="Widget Sistemi" width="100%">
        <p align="center"><em>Widget Sistemi</em></p>
      </td>
      <td width="33%">
        <img src="docs/images/10.png" alt="Araç Yönetimi" width="100%">
        <p align="center"><em>Araç Yönetimi</em></p>
      </td>
    </tr>
    <tr>
      <td width="33%">
        <img src="docs/images/11.png" alt="Yeni Araç Oluştur" width="100%">
        <p align="center"><em>Yeni Araç Oluştur</em></p>
      </td>
      <td width="33%">
        <img src="docs/images/12.png" alt="Araç Testi" width="100%">
        <p align="center"><em>Araç Testi</em></p>
      </td>
      <td width="33%">
      </td>
    </tr>
  </table>
</div>

---

## ✨ Temel Özellikler

### 🤖 Akıllı Konuşmalar
- **Agentic İş Akışı**: Görev tamamlanana kadar çok turlu araç çalıştırma ile otonom problem çözme
- **Gerçek Zamanlı Akış**: Yanıtların ve araç çalıştırmalarının canlı SSE tabanlı akışı
- **RAG Destekli Yanıtlar**: Dokümanlarınızı kullanarak bağlam farkında yanıtlar
- **Hibrit Arama**: Semantik benzerlik ve anahtar kelime eşleştirmesini birleştirir
- **Akıllı Bağlam Seçimi**: Sorgu karmaşıklığına göre dinamik parça seçimi
- **Konuşma Hafızası**: Çok turlu konuşmalarda bağlamı korur
- **Otomatik Oluşturulan Özetler**: Konuşma içeriğine dayalı sohbet oturumları için otomatik başlık oluşturma

### 📄 Doküman Yönetimi
- **Gelişmiş Bölümleme**: Örtüşme ile akıllı doküman bölme
- **Vektör Depolama**: Hızlı semantik arama için Qdrant entegrasyonu
- **Çoklu Format**: TXT, MD ve diğer metin formatları için destek
- **Gömme Oluşturma**: Dokümanların otomatik vektörleştirilmesi

### 🔧 Sağlayıcı Yönetimi
- **OpenAI Uyumlu**: OpenAI API için yerel destek
- **Ollama Entegrasyonu**: Modelleri Ollama ile yerel olarak çalıştırın
- **vLLM Desteği**: Yüksek performanslı çıkarım için vLLM ile dağıtın
- **Chatbot Başına Yapılandırma**: Her chatbot belirli bir sağlayıcıya atanır

### 🔍 Araç Sistemi
- **Agentic Araç Çalıştırma**: Yapay zeka hangi araçları kullanacağına özerk olarak karar verir ve bunları birbirine zincirler
- **Çok Turlu Problem Çözme**: Hedefe ulaşılana kadar birden fazla iterasyonda araçları kullanmaya devam eder
- **Gerçek Zamanlı Araç Akışı**: SSE güncellemeleri ile araç çalıştırmalarını canlı olarak görün
- **Web Arama**: Gerçek zamanlı web araması için entegre SearxNG
- **Özel Araçlar**: Genişletilebilir araç çalıştırıcı mimarisi
- **API Entegrasyonu**: Konuşmalardan harici API'leri çağırın
- **Token Optimizasyonu**: Verimli veri aktarımı için TOON (Token Optimizasyonlu Nesne Notasyonu) desteği
- **JQ Sorgu Seçici**: Yalnızca gerekli verileri ayıklamak için JSON yanıtlarını küçültün
- **Araç Kategorileri**: Daha iyi yönetim için araçları düzenleyin

### 🪟 Gömülebilir Widget Sistemi
- **Harici Entegrasyon**: Basit bir script etiketi ile herhangi bir web sitesine yapay zeka chatbot'ları gömmek
- **Özelleştirilebilir Arayüz**: Widget görünümünü markanıza uyacak şekilde ayarlayın
- **Hafif**: Ana web sitelerinde minimum performans etkisi
- **Çapraz Alan Desteği**: Farklı alanlar arasında sorunsuz çalışır
- **Kolay Kurulum**: Web sayfanıza sadece tek bir JavaScript kod parçası ekleyin

### 🔐 Güvenlik ve Kimlik Doğrulama
- **Keycloak Entegrasyonu**: Rol tabanlı erişim kontrolü ile kurumsal SSO
- **JWT Token'ları**: Güvenli oturum yönetimi
- **API Anahtarı Şifreleme**: Hassas kimlik bilgileri için AES şifreleme
- **Hız Sınırlama**: Kötüye kullanıma karşı yerleşik koruma

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                    Ön Yüz (Next.js)                          │
│  - React 19 + TypeScript                                     │
│  - Tailwind CSS + shadcn/ui                                  │
│  - SSE ile gerçek zamanlı güncellemeler                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API + SSE
┌─────────────────────▼───────────────────────────────────────┐
│                   Arka Yüz (Go + Fiber)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Kimlik Katmanı│  │ RAG Servisi  │  │ Araç Çalış.  │      │
│  │ (Keycloak)   │  │              │  │  (TOON/JQ)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────────────────────────────────────────┐      │
│  │         AI Sağlayıcı Yöneticisi                   │      │
│  │  (OpenAI / Ollama / vLLM)                        │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────┬───────────────────┬─────────────┬────────────┘
              │                   │             │
    ┌─────────▼──────┐  ┌────────▼────────┐  ┌─▼──────────┐
    │  PostgreSQL    │  │    Qdrant       │  │  SearxNG   │
    │  (Ana VT)      │  │  (Vektör VT)    │  │  (Arama)   │
    └────────────────┘  └─────────────────┘  └────────────┘
              │
    ┌─────────▼──────┐
    │     Redis      │
    │   (Önbellek)   │
    └────────────────┘
```

---

## 🛠️ Kullanılan Teknolojiler

### Arka Yüz
- **[Go](https://go.dev/)** (1.25+) - Yüksek performanslı arka yüz
- **[Fiber v3](https://gofiber.io/)** - Hızlı HTTP çerçevesi
- **[GORM](https://gorm.io/)** - Veritabanı ORM
- **[Qdrant](https://qdrant.tech/)** - Gömmeler için vektör veritabanı
- **[Redis](https://redis.io/)** - Önbellekleme ve oturum depolama
- **[Keycloak](https://www.keycloak.org/)** - Kimlik ve erişim yönetimi

### Ön Yüz
- **[Next.js 16](https://nextjs.org/)** - Turbopack ile React çerçevesi
- **[React 19](https://react.dev/)** - UI kütüphanesi
- **[TypeScript](https://www.typescriptlang.org/)** - Tip güvenliği
- **[Tailwind CSS](https://tailwindcss.com/)** - Yardımcı sınıf tabanlı stil
- **[shadcn/ui](https://ui.shadcn.com/)** - Güzel bileşen kütüphanesi
- **[Radix UI](https://www.radix-ui.com/)** - Erişilebilir temel bileşenler

### Yapay Zeka ve Makine Öğrenmesi
- **[OpenAI API](https://openai.com/)** - GPT modelleri
- **[Ollama](https://ollama.ai/)** - Yerel model dağıtımı
- **[vLLM](https://github.com/vllm-project/vllm)** - Yüksek verimli çıkarım
- **SearxNG** - Gizlilik saygılı meta arama motoru

---

## 🚀 Başlangıç

### Ön Gereksinimler

- **Docker** ve **Docker Compose**
- **Git**
- (İsteğe bağlı) Yerel geliştirme için **Go 1.25+**
- (İsteğe bağlı) Ön yüz geliştirme için **Node.js 18+**

### Docker ile Hızlı Başlangıç

1. **Depoyu klonlayın**
   ```bash
   git clone https://github.com/yourusername/sef.git
   cd sef
   ```

2. **Tüm servisleri başlatın**
   ```bash
   # Başlatmadan önce gerekli değerleri güncelleyin
   docker-compose up -d
   ```

3. **Uygulamaya erişin**
   - Ön Yüz: http://localhost:3000
   - Arka Yüz API: http://localhost:8110
   - Keycloak: http://localhost:8080
   - Qdrant Kontrol Paneli: http://localhost:6333/dashboard

4. **Keycloak'u ayarlayın** (Sadece ilk seferde)
   
   Detaylı kılavuz için [docs/KEYCLOAK_SETUP.md](docs/KEYCLOAK_SETUP.md) dosyasına bakın

### Servis Genel Bakışı

| Servis     | Port | Açıklama                        |
|------------|------|---------------------------------|
| Ön Yüz     | 3000 | Next.js web uygulaması          |
| Arka Yüz   | 8110 | Go API sunucusu                 |
| PostgreSQL | 5432 | Ana veritabanı                  |
| Redis      | 6379 | Önbellek ve oturum depolama     |
| Qdrant     | 6333 | Vektör veritabanı               |
| SearxNG    | 8888 | Arama motoru                    |
| Keycloak   | 8080 | Kimlik doğrulama sunucusu       |

---

## ⚙️ Yapılandırma

### Ortam Değişkenleri

#### Arka Yüz Yapılandırması

```env
# Uygulama
APP_ENV=production
APP_KEY=your-secret-key-here
APP_DEBUG=false

# Veritabanı
DATABASE_HOST=postgresql
DATABASE_PORT=5432
DATABASE_NAME=sef
DATABASE_USER=sef_user
DATABASE_PASSWORD=sef_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Qdrant
QDRANT_HOST=qdrant
QDRANT_PORT=6333

# Keycloak
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=sef-realm
KEYCLOAK_CLIENT_ID=sef-client
KEYCLOAK_CLIENT_SECRET=your-client-secret

# AI Sağlayıcıları (İsteğe bağlı)
OLLAMA_HOST=localhost
OLLAMA_PORT=11434
```

#### Ön Yüz Yapılandırması

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://localhost:8110
```

### Yapay Zeka Sağlayıcıları Ekleme

1. **Ayarlar** → **Sağlayıcılar**'a gidin
2. **Sağlayıcı Ekle**'ye tıklayın
3. Yapılandırın:
   - **Tür**: OpenAI, Ollama veya vLLM
   - **API Anahtarı**: Sağlayıcınızın API anahtarı
   - **Temel URL**: Sağlayıcı uç noktası
   - **Modeller**: Kullanılabilir modeller

vLLM kurulumu için [docs/vLLM_SUPPORT.md](docs/vLLM_SUPPORT.md) dosyasına bakın

---

## 🎨 Detaylı Özellikler

### RAG (Bilgi Getirme-Destekli Üretim)

RAG sistemi yapay zeka yanıtlarını dokümanlarınızla geliştirir:

1. **Doküman Yükleme**: Metin dosyaları veya markdown dokümanları yükleyin
2. **Akıllı Bölümleme**: Dokümanlar optimal parçalara bölünür
3. **Gömme Oluşturma**: Metin, vektör gömmelerine dönüştürülür
4. **Hibrit Arama**: Sorgular hem semantik hem de anahtar kelime aramasını kullanır
5. **Bağlam Enjeksiyonu**: İlgili parçalar istemlere eklenir
6. **Akıllı Yanıtlar**: Yapay zeka verilerinizi kullanarak yanıtlar üretir

#### Gelişmiş Özellikler
- **Sorgu Analizi**: Küçük sohbet ile bilgi sorgularını algılar
- **Dinamik Limitler**: Karmaşıklığa göre parça sayısını ayarlar
- **Yeniden Sıralama**: Sonuçları alaka düzeyine göre filtreler ve sıralar
- **Tekilleştirme**: Yinelenen bilgileri kaldırır

### Chatbot Özelleştirme

Özel chatbot'lar oluşturun:
- Özel sistem istemleri
- Belirli doküman koleksiyonları
- Atanmış araçlar ve yetenekler
- Özel sağlayıcı ataması
- Sıcaklık ve parametre ayarlaması

### Araç Sistemi

Yerleşik araçlar şunları içerir:
- **Web Arama**: SearxNG ile gerçek zamanlı internet araması
- **Doküman Sorgusu**: Bilgi tabanınızda arama yapın
- **API Çağrıları**: Token optimizasyonu ile HTTP istekleri yürütün
- **Özel Araçlar**: Araç çalıştırıcı arayüzü üzerinden kendi araçlarınızı ekleyin

#### Token Optimizasyon Özellikleri
- **TOON (Token Optimizasyonlu Nesne Notasyonu)**: Token kullanımını önemli ölçüde azaltan kompakt veri temsili
- **JQ Sorgu Seçici**: Token boyutunu minimize etmek için JSON yanıtlarından belirli alanları çıkarın
- **Akıllı Veri Filtreleme**: Yalnızca chatbot'unuzun gerçekten ihtiyaç duyduğu verileri alın ve işleyin
- **Düşük Maliyetler**: Daha az token tüketimi, daha düşük API maliyetleri anlamına gelir

---

## 📚 API Dokümantasyonu

### Kimlik Doğrulama

Tüm API istekleri Bearer token ile kimlik doğrulama gerektirir:

```bash
Authorization: Bearer <your-token>
```

### Ana Uç Noktalar

#### Oturumlar
```http
GET    /api/sessions                    # Tüm oturumları listele
POST   /api/sessions                    # Yeni oturum oluştur
GET    /api/sessions/:id                # Oturum detaylarını al
DELETE /api/sessions/:id                # Oturumu sil
```

#### Mesajlar
```http
GET    /api/sessions/:id/messages       # Mesajları al
POST   /api/sessions/:id/messages       # Mesaj gönder
```

#### Dokümanlar
```http
GET    /api/documents                   # Dokümanları listele
POST   /api/documents                   # Doküman yükle
DELETE /api/documents/:id               # Doküman sil
```

#### Chatbot'lar
```http
GET    /api/chatbots                    # Chatbot'ları listele
POST   /api/chatbots                    # Chatbot oluştur
PUT    /api/chatbots/:id                # Chatbot'u güncelle
DELETE /api/chatbots/:id                # Chatbot'u sil
```

Tam API dokümantasyonu için [API Referansı](docs/API.md)'na bakın.

---

## 💻 Geliştirme

### Yerel Geliştirme Kurulumu

#### Arka Yüz

```bash
cd backend

# Bağımlılıkları yükle
go mod tidy

# Geliştirme sunucusunu başlat
go run cmd/server/main.go
```

#### Ön Yüz

```bash
cd frontend

# Bağımlılıkları yükle
pnpm install

# Geliştirme sunucusunu başlat
pnpm dev
```

Yerel geliştirme için next yapılandırmasını düzenlemek isteyebilirsiniz.

### Proje Yapısı

```
sef/
├── backend/
│   ├── app/
│   │   ├── controllers/      # HTTP işleyicileri
│   │   ├── entities/         # Veritabanı modelleri
│   │   ├── middleware/       # İstek ara katmanı
│   │   └── routes/           # Rota tanımları
│   ├── internal/             # Dahili paketler
│   ├── pkg/                  # Yeniden kullanılabilir paketler
│   │   ├── rag/              # RAG uygulaması
│   │   ├── providers/        # AI sağlayıcı istemcileri
│   │   ├── toolrunners/      # Araç çalıştırma
│   │   └── ...
│   └── cmd/server/           # Giriş noktası
│
├── frontend/
│   ├── src/
│   │   ├── components/       # React bileşenleri
│   │   ├── hooks/            # Özel hook'lar
│   │   ├── lib/              # Yardımcı araçlar
│   │   ├── pages/            # Next.js sayfaları
│   │   ├── services/         # API servisleri
│   │   └── types/            # TypeScript tipleri
│   └── public/               # Statik varlıklar
│
├── docs/                     # Dokümantasyon
└── docker-compose.yml        # Docker kurulumu
```

### Kod Stili

- **Arka Yüz**: Standart Go kurallarına uyun (`gofmt`, `golint`)
- **Ön Yüz**: ESLint + Prettier yapılandırılmış
- **Commit'ler**: Geleneksel commit formatını kullanın

---

## 🚢 Dağıtım

### Docker Üretimi

```bash
# Tüm servisleri derle ve başlat
docker-compose up -d --build

# Günlükleri görüntüle
docker-compose logs -f

# Servisleri durdur
docker-compose down
```

### Nginx Kurulumu

HTTPS dağıtımı için:

```bash
chmod +x scripts/setup-nginx-https.sh
./scripts/setup-nginx-https.sh
```

---

## 🤝 Katkıda Bulunma

Katkılara açığız! Lütfen şu adımları izleyin:

1. **Depoyu fork edin**
2. **Bir özellik dalı oluşturun**
   ```bash
   git checkout -b feature/harika-ozellik
   ```
3. **Değişikliklerinizi yapın**
4. **Değişikliklerinizi commit edin**
   ```bash
   git commit -m 'feat: harika özellik ekle'
   ```
5. **Fork'unuza push edin**
   ```bash
   git push origin feature/harika-ozellik
   ```
6. **Bir Pull Request açın**

### Geliştirme Kılavuzları

- Temiz, dokümante edilmiş kod yazın
- Yeni özellikler için testler ekleyin
- Dokümantasyonu gerektiği gibi güncelleyin
- Mevcut kod stilini takip edin
- Commit'leri atomik ve iyi açıklanmış tutun

---

## 📄 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - detaylar için [LICENSE.md](LICENSE.md) dosyasına bakın.

---

## 🙏 Teşekkürler

Harika açık kaynak teknolojileri ile geliştirilmiştir:
- [Go](https://go.dev/)
- [Next.js](https://nextjs.org/)
- [Qdrant](https://qdrant.tech/)
- [Keycloak](https://www.keycloak.org/)
- [SearxNG](https://docs.searxng.org/)
- [shadcn/ui](https://ui.shadcn.com/)

---

## 📞 Destek

- **Dokümantasyon**: [docs/](docs/)
- **Sorunlar**: [GitHub Issues](https://github.com/limanmys/sef/issues)
- **Tartışmalar**: [GitHub Discussions](https://github.com/limanmys/sef/discussions)

---

<div align="center">
  <p>HAVELSAN Açıklab tarafından ❤️ ile yapılmıştır</p>
  <p>⭐ Bu projeyi faydalı buluyorsanız GitHub'da yıldızlayın!</p>
</div>
