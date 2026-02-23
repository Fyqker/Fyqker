<?php
require_once __DIR__ . '/init.php';

$pdo = getPDO();
$user = currentUser();
$topicId = (int)($_GET['id'] ?? 0);

$stmt = $pdo->prepare('SELECT t.id, t.title, t.content, t.created_at, u.username
    FROM topics t
    JOIN users u ON u.id = t.user_id
    WHERE t.id = :id');
$stmt->execute([':id' => $topicId]);
$topic = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$topic) {
    http_response_code(404);
    echo 'Konu bulunamadı.';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $user) {
    $content = trim($_POST['content'] ?? '');
    if ($content !== '') {
        $insert = $pdo->prepare('INSERT INTO replies (topic_id, user_id, content, created_at) VALUES (:tid, :uid, :c, :d)');
        $insert->execute([
            ':tid' => $topicId,
            ':uid' => $user['id'],
            ':c' => $content,
            ':d' => date('Y-m-d H:i'),
        ]);
        header('Location: topic.php?id=' . $topicId);
        exit;
    }
}

$repliesStmt = $pdo->prepare('SELECT r.content, r.created_at, u.username
    FROM replies r
    JOIN users u ON u.id = r.user_id
    WHERE r.topic_id = :tid
    ORDER BY r.id ASC');
$repliesStmt->execute([':tid' => $topicId]);
$replies = $repliesStmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($topic['title']) ?></title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="container">
  <div class="card nav">
    <a class="secondary" href="index.php">← Ana Sayfa</a>
  </div>

  <div class="card">
    <h2><?= e($topic['title']) ?></h2>
    <div class="meta">Açan: <?= e($topic['username']) ?> • <?= e($topic['created_at']) ?></div>
    <p><?= nl2br(e($topic['content'])) ?></p>
  </div>

  <div class="card">
    <h3>Yanıtlar</h3>
    <?php if (empty($replies)): ?>
      <p>Henüz yanıt yok.</p>
    <?php else: ?>
      <?php foreach ($replies as $reply): ?>
        <div class="reply">
          <div class="meta"><?= e($reply['username']) ?> • <?= e($reply['created_at']) ?></div>
          <div><?= nl2br(e($reply['content'])) ?></div>
        </div>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>

  <div class="card">
    <?php if ($user): ?>
      <h3>Yanıt Yaz</h3>
      <form method="post">
        <textarea name="content" placeholder="Yanıtını yaz" required></textarea>
        <button class="btn" type="submit">Yanıt Gönder</button>
      </form>
    <?php else: ?>
      <p>Yanıt yazmak için <a href="login.php">giriş yap</a>.</p>
    <?php endif; ?>
  </div>
</div>
</body>
</html>
