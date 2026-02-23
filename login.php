<?php
require_once __DIR__ . '/init.php';

if (currentUser()) {
    header('Location: index.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    $stmt = getPDO()->prepare('SELECT id, username, password_hash FROM users WHERE username = :u');
    $stmt->execute([':u' => $username]);
    $dbUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($dbUser && password_verify($password, $dbUser['password_hash'])) {
        $_SESSION['user_id'] = $dbUser['id'];
        header('Location: index.php');
        exit;
    }

    $error = 'Kullanıcı adı veya şifre hatalı.';
}
?>
<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Giriş</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="container">
  <div class="card">
    <h2>Giriş Yap</h2>
    <?php if ($error): ?><div class="alert"><?= e($error) ?></div><?php endif; ?>
    <form method="post">
      <input type="text" name="username" placeholder="Kullanıcı adı" required>
      <input type="password" name="password" placeholder="Şifre" required>
      <button class="btn" type="submit">Giriş Yap</button>
      <a class="btn secondary" href="index.php">Ana Sayfa</a>
    </form>
  </div>
</div>
</body>
</html>
