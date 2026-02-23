# HasanGPT (Web) 🤖

Bu proje, **Python olmadan** sadece **HTML + CSS + JavaScript** ile hazırlanmış, Gemini API kullanan şık bir web chatbot arayüzüdür.

## Özellikler

- Modern ve responsive tasarım
- Gemini modelini arayüzden seçebilme
- API key göster/gizle butonu
- Sohbet balonları ve hata mesajları

## Kurulum ve Çalıştırma

Bu proje statik dosyalardan oluşur.

### 1) Dosyaları indir

Repo içindeki şu dosyalar yeterlidir:

- `index.html`
- `styles.css`
- `app.js`

### 2) Tarayıcıda aç

Doğrudan `index.html` açılabilir; ancak en sağlıklı yöntem bir local server ile çalıştırmaktır:

```bash
python -m http.server 8000
```

Sonra tarayıcıdan:

```text
http://localhost:8000
```

### 3) Kullanım

1. Gemini API key alanına anahtarınızı yazın.
2. Model adını girin (varsayılan: `gemini-1.5-flash`).
3. Mesajınızı yazıp **Gönder** butonuna basın.

## Not

API key tarayıcıdan Google endpoint’ine gönderilir. Üretim senaryolarında güvenlik için bir backend proxy kullanılması önerilir.
