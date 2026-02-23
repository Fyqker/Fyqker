<?php
require_once __DIR__ . '/init.php';

requireLogin();
$user = currentUser();
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = trim($_POST['title'] ?? '');
    $content = trim($_POST['content'] ?? '');

    if ($title === '' || $content === '') {
        $error = 'Başlık ve içerik alanları zorunludur.';
    } else {
        $stmt = getPDO()->prepare('INSERT INTO topics (user_id, title, content, created_at) VALUES (:uid, :t, :c, :d)');
        $stmt->execute([
            ':uid' => $user['id'],
            ':t' => $title,
            ':c' => $content,
            ':d' => date('Y-m-d H:i'),
        ]);
        header('Location: index.php');
        exit;
    }
}
?>
<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yeni Konu</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="container">
  <div class="card">
    <h2>Yeni Konu Aç</h2>
    <?php if ($error): ?><div class="alert"><?= e($error) ?></div><?php endif; ?>
    <form method="post">
      <input type="text" name="title" placeholder="Konu başlığı" required>
      <textarea name="content" placeholder="Konu detayları" required></textarea>
      <button class="btn" type="submit">Konuyu Paylaş</button>
      <a class="btn secondary" href="index.php">Vazgeç</a>
    </form>
  </div>
</div>
</body>
</html>
