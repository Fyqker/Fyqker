# HasanGPT (Web) 🤖

Bu proje, **HTML + CSS + JavaScript** ile hazırlanmış, Gemini API kullanan şık bir web chatbot arayüzüdür.

## Özellikler

- Modern ve responsive tasarım
- Gemini modelini arayüzden seçebilme
- Sohbet balonları ve hata mesajları
- API key sabit koddan kullanma (input yok)

## Kurulum ve Çalıştırma

### 1) API key'i koda yaz

`app.js` içindeki aşağıdaki satırı kendi key’inle değiştir:

```js
const GEMINI_API_KEY = 'BURAYA_GEMINI_API_KEY_YAZ';
```

### 2) Local server ile aç

```bash
python -m http.server 8000
```

Sonra tarayıcıdan:

```text
http://localhost:8000
```

### 3) Kullanım

1. Model adını girin (varsayılan: `gemini-2.0-flash`).
2. Mesajınızı yazıp **Gönder** butonuna basın.

## Güvenlik Notu

API key’i front-end koduna yazmak güvenlik riski taşır. Üretimde backend proxy kullanılması önerilir.

Eğer `API_KEY_INVALID` hatası görüyorsanız, key kısıtlamalarında localhost/127.0.0.1 izinlerini ve Google AI Studio projesinde API durumunu kontrol edin.
