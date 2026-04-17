#!/usr/bin/env python3
"""
Tkinter LAN Home Server (Python 3.8)
- Local network chat via browser
- File upload/list/download
"""

import cgi
import json
import os
import socket
import threading
import urllib.parse
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from tkinter import Tk, StringVar, Text, END, filedialog
from tkinter import ttk


HTML_PAGE = """<!doctype html>
<html lang=\"tr\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />
  <title>LAN Home Server</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fb; color: #222; }
    h1 { margin-top: 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    #messages { height: 300px; overflow: auto; border: 1px solid #ccc; padding: 8px; background: #fafafa; }
    .msg { margin-bottom: 8px; border-bottom: 1px dashed #eee; padding-bottom: 4px; }
    input, button { padding: 8px; margin: 4px 0; }
    button { cursor: pointer; }
    #fileList li { margin: 6px 0; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>LAN Home Server</h1>
  <p>Bu sayfaya bağlanan kullanıcılar mesajlaşabilir ve dosya paylaşabilir.</p>

  <div class=\"grid\">
    <section class=\"card\">
      <h2>Canlı Mesajlaşma</h2>
      <div id=\"messages\"></div>
      <input id=\"name\" placeholder=\"Adınız\" maxlength=\"40\" />
      <input id=\"message\" placeholder=\"Mesajınız\" maxlength=\"400\" />
      <button onclick=\"sendMessage()\">Gönder</button>
    </section>

    <section class=\"card\">
      <h2>Dosya Sunucusu</h2>
      <form id=\"uploadForm\">
        <input type=\"file\" id=\"fileInput\" name=\"file\" required />
        <button type=\"submit\">Yükle</button>
      </form>
      <h3>Dosyalar</h3>
      <ul id=\"fileList\"></ul>
    </section>
  </div>

  <script>
    async function fetchMessages() {
      const res = await fetch('/api/messages');
      const data = await res.json();
      const box = document.getElementById('messages');
      box.innerHTML = '';
      data.forEach(m => {
        const div = document.createElement('div');
        div.className = 'msg';
        div.textContent = `[${m.time}] ${m.name}: ${m.message}`;
        box.appendChild(div);
      });
      box.scrollTop = box.scrollHeight;
    }

    async function sendMessage() {
      const name = document.getElementById('name').value.trim() || 'Misafir';
      const message = document.getElementById('message').value.trim();
      if (!message) return;
      await fetch('/api/messages', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, message})
      });
      document.getElementById('message').value = '';
      fetchMessages();
    }

    async function fetchFiles() {
      const res = await fetch('/api/files');
      const data = await res.json();
      const ul = document.getElementById('fileList');
      ul.innerHTML = '';
      data.forEach(f => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '/download?name=' + encodeURIComponent(f.name);
        a.textContent = `${f.name} (${f.size} bytes)`;
        li.appendChild(a);
        ul.appendChild(li);
      });
    }

    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = document.getElementById('fileInput').files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/upload', {method: 'POST', body: fd});
      const data = await res.json();
      alert(data.message);
      document.getElementById('fileInput').value = '';
      fetchFiles();
    });

    document.getElementById('message').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    setInterval(fetchMessages, 1500);
    setInterval(fetchFiles, 5000);
    fetchMessages();
    fetchFiles();
  </script>
</body>
</html>
"""


class ServerState:
    def __init__(self, storage_dir, logger):
        self.storage_dir = storage_dir
        self.logger = logger
        self.messages = []
        self.lock = threading.Lock()

    def add_message(self, name, message):
        now = datetime.now().strftime("%H:%M:%S")
        entry = {"name": name[:40], "message": message[:400], "time": now}
        with self.lock:
            self.messages.append(entry)
            self.messages = self.messages[-500:]
        self.logger("Mesaj: {}: {}".format(entry["name"], entry["message"]))

    def get_messages(self):
        with self.lock:
            return list(self.messages)


def safe_filename(name):
    name = os.path.basename(name or "")
    return name.replace("..", "_")


class HomeRequestHandler(BaseHTTPRequestHandler):
    server_version = "LANHomeServer/1.0"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/":
            self._send_html(HTML_PAGE)
            return
        if parsed.path == "/api/messages":
            self._send_json(self.server.state.get_messages())
            return
        if parsed.path == "/api/files":
            self._send_json(self._list_files())
            return
        if parsed.path == "/download":
            qs = urllib.parse.parse_qs(parsed.query)
            name = safe_filename((qs.get("name") or [""])[0])
            self._send_file(name)
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Bulunamadı")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/messages":
            self._handle_message_post()
            return
        if parsed.path == "/upload":
            self._handle_upload()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Bulunamadı")

    def _handle_message_post(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length)
            data = json.loads(body.decode("utf-8"))
            name = str(data.get("name", "Misafir")).strip() or "Misafir"
            message = str(data.get("message", "")).strip()
            if not message:
                self._send_json({"ok": False, "error": "Mesaj boş."}, status=400)
                return
            self.server.state.add_message(name, message)
            self._send_json({"ok": True})
        except Exception as exc:
            self.server.state.logger("Mesaj hatası: {}".format(exc))
            self._send_json({"ok": False, "error": "Mesaj alınamadı."}, status=400)

    def _handle_upload(self):
        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                },
            )
            if "file" not in form:
                self._send_json({"ok": False, "message": "Dosya yok."}, status=400)
                return
            uploaded = form["file"]
            filename = safe_filename(uploaded.filename)
            if not filename:
                self._send_json({"ok": False, "message": "Geçersiz dosya adı."}, status=400)
                return
            target = os.path.join(self.server.state.storage_dir, filename)
            with open(target, "wb") as f:
                f.write(uploaded.file.read())
            self.server.state.logger("Yüklendi: {}".format(filename))
            self._send_json({"ok": True, "message": "Yüklendi: {}".format(filename)})
        except Exception as exc:
            self.server.state.logger("Yükleme hatası: {}".format(exc))
            self._send_json({"ok": False, "message": "Yükleme başarısız."}, status=400)

    def _list_files(self):
        result = []
        folder = self.server.state.storage_dir
        for name in sorted(os.listdir(folder)):
            path = os.path.join(folder, name)
            if os.path.isfile(path):
                result.append({"name": name, "size": os.path.getsize(path)})
        return result

    def _send_file(self, name):
        if not name:
            self.send_error(HTTPStatus.BAD_REQUEST, "Dosya adı gerekli")
            return
        target = os.path.join(self.server.state.storage_dir, name)
        if not os.path.isfile(target):
            self.send_error(HTTPStatus.NOT_FOUND, "Dosya yok")
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Disposition", 'attachment; filename="{}"'.format(name))
        self.send_header("Content-Length", str(os.path.getsize(target)))
        self.end_headers()
        with open(target, "rb") as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)

    def _send_html(self, html):
        data = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, obj, status=200):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        self.server.state.logger("HTTP: " + (fmt % args))


class LanHomeServerGUI:
    def __init__(self):
        self.root = Tk()
        self.root.title("LAN Home Server (Tkinter)")
        self.root.geometry("780x520")

        self.host_var = StringVar(value=self._detect_local_ip())
        self.port_var = StringVar(value="8000")
        self.dir_var = StringVar(value=os.path.join(os.getcwd(), "storage"))

        self.httpd = None
        self.server_thread = None

        self._build_ui()

    def _build_ui(self):
        frame = ttk.Frame(self.root, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Host:").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame, textvariable=self.host_var, width=25).grid(row=0, column=1, sticky="w")

        ttk.Label(frame, text="Port:").grid(row=0, column=2, sticky="w", padx=(10, 0))
        ttk.Entry(frame, textvariable=self.port_var, width=10).grid(row=0, column=3, sticky="w")

        ttk.Label(frame, text="Storage klasörü:").grid(row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Entry(frame, textvariable=self.dir_var, width=50).grid(row=1, column=1, columnspan=2, sticky="we", pady=(8, 0))
        ttk.Button(frame, text="Seç", command=self.pick_dir).grid(row=1, column=3, sticky="w", pady=(8, 0))

        self.start_btn = ttk.Button(frame, text="Sunucuyu Başlat", command=self.start_server)
        self.start_btn.grid(row=2, column=0, pady=10, sticky="w")

        self.stop_btn = ttk.Button(frame, text="Durdur", command=self.stop_server, state="disabled")
        self.stop_btn.grid(row=2, column=1, pady=10, sticky="w")

        self.url_label = ttk.Label(frame, text="URL: -")
        self.url_label.grid(row=2, column=2, columnspan=2, sticky="w")

        self.log_text = Text(frame, height=22)
        self.log_text.grid(row=3, column=0, columnspan=4, sticky="nsew")

        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(3, weight=1)

    def pick_dir(self):
        folder = filedialog.askdirectory(initialdir=self.dir_var.get() or os.getcwd())
        if folder:
            self.dir_var.set(folder)

    def log(self, message):
        line = "[{}] {}\n".format(datetime.now().strftime("%H:%M:%S"), message)
        self.log_text.insert(END, line)
        self.log_text.see(END)

    def _detect_local_ip(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
        except Exception:
            return "127.0.0.1"
        finally:
            sock.close()

    def start_server(self):
        if self.httpd:
            return
        host = self.host_var.get().strip() or "0.0.0.0"
        try:
            port = int(self.port_var.get().strip())
        except ValueError:
            self.log("Port sayı olmalı")
            return

        storage = self.dir_var.get().strip() or os.path.join(os.getcwd(), "storage")
        os.makedirs(storage, exist_ok=True)

        state = ServerState(storage_dir=storage, logger=self.log)

        try:
            self.httpd = ThreadingHTTPServer((host, port), HomeRequestHandler)
            self.httpd.state = state
            self.server_thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
            self.server_thread.start()
        except Exception as exc:
            self.httpd = None
            self.server_thread = None
            self.log("Başlatma hatası: {}".format(exc))
            return

        url = "http://{}:{}/".format(host, port)
        self.url_label.config(text="URL: {}".format(url))
        self.log("Sunucu başladı -> {}".format(url))
        self.log("Storage: {}".format(storage))
        self.start_btn.config(state="disabled")
        self.stop_btn.config(state="normal")

    def stop_server(self):
        if not self.httpd:
            return
        self.httpd.shutdown()
        self.httpd.server_close()
        self.httpd = None
        self.server_thread = None
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")
        self.url_label.config(text="URL: -")
        self.log("Sunucu durduruldu")

    def run(self):
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        self.root.mainloop()

    def on_close(self):
        self.stop_server()
        self.root.destroy()


if __name__ == "__main__":
    LanHomeServerGUI().run()
