const chatForm = document.getElementById('chatForm');
const promptInput = document.getElementById('prompt');
const modelInput = document.getElementById('model');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

// TODO: Kendi Gemini API key'inizi buraya yazın.
const GEMINI_API_KEY = 'AIzaSyBcMUxyFgpJqOxqAPfvPl_Ta39vr-hgSv8';

function addMessage(text, role = 'bot') {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

async function sendToGemini(apiKey, model, prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API hatası (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ||
    'Yanıt alınamadı.'
  );
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const apiKey = GEMINI_API_KEY.trim();
  const model = modelInput.value.trim() || 'gemini-1.5-flash';
  const prompt = promptInput.value.trim();

  if (!apiKey || apiKey === 'BURAYA_GEMINI_API_KEY_YAZ') {
    addMessage('Lütfen app.js içinde GEMINI_API_KEY değerini ayarla.', 'error');
    return;
  }

  if (!prompt) {
    return;
  }

  addMessage(prompt, 'user');
  promptInput.value = '';

  sendBtn.disabled = true;
  sendBtn.textContent = 'Gönderiliyor...';

  const loadingBubble = addMessage('HasanGPT düşünüyor...');

  try {
    const reply = await sendToGemini(apiKey, model, prompt);
    loadingBubble.textContent = reply;
  } catch (error) {
    loadingBubble.parentElement.classList.add('error');
    loadingBubble.textContent = error.message;
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Gönder';
    promptInput.focus();
  }
});
