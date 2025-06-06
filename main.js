import { GoogleGenerativeAI } from "@google/generative-ai";
import MarkdownIt from 'markdown-it';
import './style.css';

const API_KEY = 'GEMINI_API_KEY';
const md = new MarkdownIt();

// DOM Elements
const form = document.querySelector('.input-form');
const promptInput = document.querySelector('textarea[name="prompt"]');
const messagesContainer = document.querySelector('.messages');
const newChatButton = document.getElementById('newChat');
const submitButton = form.querySelector('button[type="submit"]');
const historyContainer = document.querySelector('.history');

// Chat History Management
let chatHistory = [];
let allChats = [];
const STORAGE_KEY = 'ai_consultant_chats';
let currentChatId = null;

// Load chats from localStorage
function loadChats() {
  const savedChats = localStorage.getItem(STORAGE_KEY);
  if (savedChats) {
    allChats = JSON.parse(savedChats);
    // Create new chat if none exists
    if (allChats.length === 0) {
      createNewChat();
    } else {
      // Load most recent chat
      loadChat(allChats[allChats.length - 1].id);
      renderChatList();
    }
  } else {
    createNewChat();
  }
}

// Save chats to localStorage
function saveChats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allChats));
  renderChatList();
}

// Create new chat
function createNewChat() {
  const newChat = {
    id: Date.now(),
    title: 'Chat Baru',
    messages: [],
    timestamp: new Date()
  };
  allChats.push(newChat);
  currentChatId = newChat.id;
  chatHistory = newChat.messages;
  saveChats();
  messagesContainer.innerHTML = '';
  addWelcomeMessage();
}

// Load specific chat
function loadChat(chatId) {
  const chat = allChats.find(c => c.id === chatId);
  if (chat) {
    currentChatId = chat.id;
    chatHistory = chat.messages;
    messagesContainer.innerHTML = '';
    chatHistory.forEach(msg => {
      renderMessage(msg.role, msg.content, msg.timestamp);
    });
    // Update chat list UI
    renderChatList();
  }
}

// Render chat list in sidebar
function renderChatList() {
  historyContainer.innerHTML = '';
  allChats.slice().reverse().forEach(chat => {
    const chatElement = document.createElement('div');
    chatElement.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
    
    // Get first message or default title
    const chatTitle = chat.messages.length > 0 ? 
      chat.messages[0].content.substring(0, 30) + '...' : 
      'Chat Baru';
    
    // Format date
    const date = new Date(chat.timestamp);
    const formattedDate = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });
    
    chatElement.innerHTML = `
      <div class="chat-info">
        <div class="chat-title">${chatTitle}</div>
        <div class="chat-date">${formattedDate}</div>
      </div>
      <button class="delete-chat" data-id="${chat.id}">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    chatElement.addEventListener('click', (e) => {
      if (!e.target.closest('.delete-chat')) {
        loadChat(chat.id);
      }
    });
    
    historyContainer.appendChild(chatElement);
  });
  
  // Add delete handlers
  document.querySelectorAll('.delete-chat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chatId = Number(btn.dataset.id);
      deleteChat(chatId);
    });
  });
}

// Delete chat
function deleteChat(chatId) {
  if (confirm('Apakah Anda yakin ingin menghapus chat ini?')) {
    allChats = allChats.filter(c => c.id !== chatId);
    saveChats();
    if (chatId === currentChatId) {
      if (allChats.length > 0) {
        loadChat(allChats[allChats.length - 1].id);
      } else {
        createNewChat();
      }
    }
  }
}

// Auto-resize textarea
promptInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 150) + 'px';
  submitButton.disabled = !this.value.trim();
});

// Enter to send, Shift+Enter for new line
promptInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!submitButton.disabled) {
      form.dispatchEvent(new Event('submit'));
    }
  }
});

// Welcome message
function addWelcomeMessage() {
  const welcomeMessage = `Selamat datang di AI Konsultan Lingkungan 👋
  
Silakan ajukan pertanyaan tentang:
• Pengelolaan sampah
• Daur ulang
• Solusi ramah lingkungan`;
  
  addMessage('ai', welcomeMessage);
}

// Format timestamp
function getFormattedTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
}

// Render message UI
function renderMessage(role, content, timestamp) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.innerHTML = role === 'user' ? '👤' : '🌿';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';
  
  // Add timestamp
  const timestampDiv = document.createElement('div');
  timestampDiv.className = 'timestamp';
  timestampDiv.textContent = getFormattedTime(timestamp);
  
  // Convert markdown and sanitize
  contentDiv.innerHTML = md.render(content);
  contentDiv.appendChild(timestampDiv);
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  
  // Scroll to bottom with smooth animation
  messagesContainer.scrollTo({
    top: messagesContainer.scrollHeight,
    behavior: 'smooth'
  });
}

// Add message and save to history
function addMessage(role, content) {
  const message = {
    role,
    content,
    timestamp: new Date().toISOString()
  };
  
  // Add to current chat history
  chatHistory.push(message);
  
  // Update chat title if it's the first message
  const currentChat = allChats.find(c => c.id === currentChatId);
  if (currentChat && currentChat.messages.length === 0 && role === 'user') {
    currentChat.title = content.substring(0, 30) + '...';
  }
  
  // Update messages in allChats
  currentChat.messages = chatHistory;
  
  // Save to localStorage
  saveChats();
  
  // Render message
  renderMessage(role, content, message.timestamp);
}

// Add typing indicator
function addTypingIndicator() {
  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.innerHTML = `
    <div class="avatar">🌿</div>
    <div class="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  messagesContainer.appendChild(typing);
  messagesContainer.scrollTo({
    top: messagesContainer.scrollHeight,
    behavior: 'smooth'
  });
  return typing;
}

// Handle form submission
form.onsubmit = async (ev) => {
  ev.preventDefault();
  
  const userInput = promptInput.value.trim();
  if (!userInput) return;
  
  // Disable input while processing
  promptInput.disabled = true;
  submitButton.disabled = true;
  
  // Add user message
  addMessage('user', userInput);
  
  // Clear input and reset height
  promptInput.value = '';
  promptInput.style.height = 'auto';
  
  // Show typing indicator
  const typingIndicator = addTypingIndicator();
  
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent({
      contents: [{
        parts: [{
          text: `Kamu adalah asisten ahli lingkungan yang berkomunikasi seperti teman chat.
Berikan jawaban yang natural dan sesuai konteks percakapan.
Gunakan informasi dari chat sebelumnya untuk memberikan respons yang relevan.
Tetap fokus pada topik tapi bisa mengaitkan dengan konteks sebelumnya jika relevan.

Riwayat chat sebelumnya:
${chatHistory.map(msg => `${msg.role === 'user' ? 'Pengguna' : 'AI'}: ${msg.content}`).slice(-3).join('\n')}

Pertanyaan baru: ${userInput}

Berikan respons yang natural dan kontekstual, tapi tetap singkat dan jelas.`
        }]
      }]
    });

    // Remove typing indicator
    typingIndicator.remove();

    const response = await result.response;
    const text = response.text();
    
    // Add AI response
    addMessage('ai', text);
  } catch (e) {
    console.error(e);
    // Remove typing indicator
    typingIndicator.remove();
    
    addMessage('ai', `❌ Maaf, terjadi kesalahan dalam memproses permintaan Anda.

Pesan error: ${e.message}

Silakan coba lagi dalam beberapa saat. Jika masalah berlanjut, mohon refresh halaman.`);
  } finally {
    // Re-enable input
    promptInput.disabled = false;
    submitButton.disabled = false;
    promptInput.focus();
  }
};

// New chat button
newChatButton.onclick = () => {
  createNewChat();
  promptInput.focus();
};

// Initialize
loadChats();

