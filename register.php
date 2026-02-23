<?php
require_once __DIR__ . '/init.php';

$user = currentUser();
if ($user) {
    header('Location: index.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username === '' || $password === '') {
        $error = 'Kullanıcı adı ve şifre zorunludur.';
    } elseif (mb_strlen($username) < 3 || mb_strlen($password) < 4) {
        $error = 'Kullanıcı adı en az 3, şifre en az 4 karakter olmalıdır.';
    } else {
        try {
            $stmt = getPDO()->prepare('INSERT INTO users (username, password_hash, created_at) VALUES (:u, :p, :c)');
            $stmt->execute([
                ':u' => $username,
                ':p' => password_hash($password, PASSWORD_DEFAULT),
                ':c' => date('Y-m-d H:i'),
            ]);
            header('Location: login.php');
            exit;
        } catch (PDOException $e) {
            $error = 'Bu kullanıcı adı zaten kullanılıyor.';
        }
    }
}
?>
<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kayıt Ol</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="container">
  <div class="card">
    <h2>Kayıt Ol</h2>
    <?php if ($error): ?><div class="alert"><?= e($error) ?></div><?php endif; ?>
    <form method="post">
      <input type="text" name="username" placeholder="Kullanıcı adı" required>
      <input type="password" name="password" placeholder="Şifre" required>
      <button class="btn" type="submit">Kayıt Ol</button>
      <a class="btn secondary" href="index.php">Ana Sayfa</a>
    </form>
  </div>
</div>
</body>
</html>
