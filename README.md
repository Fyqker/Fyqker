## Pixel Battle Royale 3D (Optimize Edition)

Tarayıcıda çalışan 3D battle royale demo. Bu sürümde odak: **performans + oynanabilirlik + başlangıç GUI ayarları**.

### Yeni eklenenler
- Oyun başlamadan önce gelişmiş GUI:
  - Bot sayısı
  - Harita boyutu
  - Kolay / Orta / Zor
  - Grafik kalite (düşük/orta/yüksek)
- Botlar optimize edilip azaltılabilir hale getirildi (ayar ekranından)
- Oyuncu ve botlara daha belirgin low-poly/pixel karakter modeli eklendi
- Hız oranı dengesi: oyuncu ve bot hızları zorluk seviyesine göre orantılı
- Ateş etme sistemi iyileştirildi (raycast hit detection)
- 2 sürülebilir araç eklendi:
  - Buggy (hızlı)
  - Truck (daha dengeli)
- Araça bin / in: `F`
- Zone optimizasyonu: her frame mesh yaratmak yerine tek zone mesh ölçekleniyor

### Kontroller
- `WASD`: hareket / araç sürme
- `Shift`: sprint
- `Space`: zıpla
- `Mouse`: kamera
- `Sol tık`: ateş
- `R`: reload
- `1/2/3`: silah değiştir
- `F`: loot aç / araca bin-in
- `E`: medkit
- `Q`: dash

### Çalıştırma
```bash
python3 -m http.server 8080
```

Aç:
`http://localhost:8080`
