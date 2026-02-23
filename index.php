<?php
require_once __DIR__ . '/init.php';

$pdo = getPDO();
$user = currentUser();
$topics = $pdo->query('SELECT t.id, t.title, t.content, t.created_at, u.username
    FROM topics t
    JOIN users u ON u.id = t.user_id
    ORDER BY t.id DESC')->fetchAll(PDO::FETCH_ASSOC);
?>
<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Okul Forumu</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
<header>
  <h1>Avcılar İstanbul Haydar Akın Mesleki ve Teknik Lisesi Forumu</h1>
  <p>Öğrenciler için duyuru, soru-cevap ve paylaşım alanı</p>
</header>
<div class="container">
  <div class="card nav">
    <div>
      <?php if ($user): ?>
        Hoş geldin, <strong><?= e($user['username']) ?></strong>
      <?php else: ?>
        Forumu kullanmak için giriş yap veya kayıt ol.
      <?php endif; ?>
    </div>
    <div>
      <?php if ($user): ?>
        <a href="create_topic.php">Yeni Konu</a>
        <a class="secondary" href="logout.php">Çıkış</a>
      <?php else: ?>
        <a href="login.php">Giriş</a>
        <a class="secondary" href="register.php">Kayıt Ol</a>
      <?php endif; ?>
    </div>
  </div>

  <div class="card">
    <h2>Son Konular</h2>
    <?php if (empty($topics)): ?>
      <p>Henüz konu açılmamış. İlk konuyu sen açabilirsin.</p>
    <?php else: ?>
      <?php foreach ($topics as $topic): ?>
        <div class="list-item">
          <h3><a href="topic.php?id=<?= (int)$topic['id'] ?>"><?= e($topic['title']) ?></a></h3>
          <div class="meta">Açan: <?= e($topic['username']) ?> • <?= e($topic['created_at']) ?></div>
          <p><?= nl2br(e(mb_strimwidth($topic['content'], 0, 220, '...'))) ?></p>
        </div>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>
</div>
</body>
</html>
