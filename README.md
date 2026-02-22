# LezzetAI 🍳

Evde bulunan malzemelere göre yapay zeka destekli (puanlama mantığıyla) tarif öneren modern bir web sitesi.

## Özellikler
- 500+ tariflik geniş veri havuzu ile malzeme listesine göre tarif uyum puanı hesaplama
- Mutfak tipi filtreleme (Türk mutfağı, pratik, sağlıklı)
- Maksimum süreye göre öneri sıralama
- Şık ve mobil uyumlu arayüz

## Çalıştırma
Bu proje saf HTML/CSS/JS ile yazıldı.

```bash
python3 -m http.server 4173
```

Ardından tarayıcıdan:

`http://localhost:4173`

## Dosya yapısı
- `index.html`: Sayfa iskeleti
- `styles.css`: Tasarım
- `app.js`: Tarif veri seti, puanlama ve render mantığı
