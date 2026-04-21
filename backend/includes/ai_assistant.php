<?php
// AI Assistant Floating Widget
// Include this at the bottom of any page to enable the AI chatbot.
// Set $current_document_name in the parent page for context-awareness.
$ai_context = $current_document_name ?? null;
?>

<!-- AI Floating Action Button -->
<button class="ai-fab" id="aiFab" title="AI Assistant" aria-label="Open AI Assistant">🤖</button>

<!-- AI Chat Panel -->
<div class="ai-chat-panel" id="aiChatPanel">
    <div class="ai-chat-header">
        <div class="ai-avatar">🤖</div>
        <div class="ai-info">
            <div class="ai-name">GSFC AI Assistant</div>
            <div class="ai-status">● Online</div>
        </div>
        <button class="ai-close" id="aiClose" aria-label="Close AI Chat">✕</button>
    </div>

    <?php if ($ai_context): ?>
    <div class="ai-context-bar" id="aiContextBar">
        📄 Context: <strong><?= htmlspecialchars($ai_context) ?></strong>
    </div>
    <?php endif; ?>

    <div class="ai-chat-body" id="aiChatBody">
        <!-- Messages will be injected here by JS -->
    </div>

    <div class="ai-chat-input">
        <input type="text" id="aiInput" placeholder="Ask me anything..." autocomplete="off">
        <button id="aiSend" aria-label="Send message">➤</button>
    </div>
</div>

<script>
(function() {
    const fab = document.getElementById('aiFab');
    const panel = document.getElementById('aiChatPanel');
    const closeBtn = document.getElementById('aiClose');
    const chatBody = document.getElementById('aiChatBody');
    const input = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSend');
    const contextBar = document.getElementById('aiContextBar');

    const docContext = <?= json_encode($ai_context) ?>;

    // Toggle chat
    fab.addEventListener('click', () => {
        const isOpen = panel.classList.toggle('open');
        fab.classList.toggle('active', isOpen);
        if (isOpen && chatBody.children.length === 0) {
            showWelcome();
        }
        if (isOpen) input.focus();
    });

    closeBtn.addEventListener('click', () => {
        panel.classList.remove('open');
        fab.classList.remove('active');
    });

    // Send message
    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        input.value = '';
        showTyping();
        setTimeout(() => {
            removeTyping();
            const response = generateResponse(text);
            addMessage(response, 'ai');
        }, 800 + Math.random() * 1200);
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

    function addMessage(text, type) {
        const msg = document.createElement('div');
        msg.className = 'chat-msg ' + type;
        msg.textContent = text;
        chatBody.appendChild(msg);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function showTyping() {
        const t = document.createElement('div');
        t.className = 'typing-indicator';
        t.id = 'typingIndicator';
        t.innerHTML = '<span></span><span></span><span></span>';
        chatBody.appendChild(t);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function removeTyping() {
        const t = document.getElementById('typingIndicator');
        if (t) t.remove();
    }

    function showWelcome() {
        if (docContext) {
            addMessage(`Hello! 👋 You are currently viewing "${docContext}". Ask me anything about this document — summaries, key topics, or exam prep tips!`, 'ai');
        } else {
            addMessage("Hello! 👋 I'm your GSFC AI Study Assistant. I can help you find resources, explain concepts, or prep for exams. What would you like to know?", 'ai');
        }
    }

    // Simulated AI Response Engine
    function generateResponse(question) {
        const q = question.toLowerCase();

        if (docContext) {
            // Context-aware responses
            if (q.includes('summary') || q.includes('summarize') || q.includes('overview'))
                return `Here's a quick summary of "${docContext}": This resource covers the key concepts and fundamentals outlined in the syllabus. It includes theoretical explanations, worked examples, and practice problems. I'd recommend focusing on the definitions and diagrams for exam prep.`;
            if (q.includes('important') || q.includes('key') || q.includes('topic'))
                return `Key topics in "${docContext}" typically include: fundamental definitions, core theorems/algorithms, practical applications, and common exam questions. Focus on understanding the "why" behind each concept.`;
            if (q.includes('exam') || q.includes('test') || q.includes('question'))
                return `For "${docContext}", common exam patterns include: short answer definitions (2-3 marks), diagram-based questions (5 marks), and long-form problem solving (10 marks). Practice the examples given in this document.`;
            if (q.includes('explain') || q.includes('what is') || q.includes('define'))
                return `Great question! Based on "${docContext}", this concept relates to the fundamental principles covered in the syllabus unit. I recommend reviewing the introduction section and the worked examples for a clearer understanding.`;
        }

        // General responses
        if (q.includes('hello') || q.includes('hi') || q.includes('hey'))
            return "Hey there! 👋 How can I help you with your studies today?";
        if (q.includes('thank'))
            return "You're welcome! Happy studying! 📚 Let me know if you need anything else.";
        if (q.includes('upload') || q.includes('share'))
            return "To upload a resource, click the 'Upload' button in the sidebar or the green upload button. You can share PDFs, DOCs, images, and presentations!";
        if (q.includes('subject') || q.includes('course'))
            return "We currently have resources for Data Structures, Mathematics II, OOP with C++, and Web Technologies. Check the dashboard for all available subjects!";
        if (q.includes('help'))
            return "I can help you with: 📖 Summarizing documents, 🎯 Finding key topics, 📝 Exam preparation tips, 🔍 Searching for resources. Just ask!";

        return `That's a great question! Based on the available resources, I'd suggest reviewing the relevant course materials on the dashboard. If you open a specific document, I can provide more targeted help. Want me to guide you to a subject?`;
    }

    // Update context dynamically (callable from parent page)
    window.setAIContext = function(name) {
        const bar = document.getElementById('aiContextBar');
        if (bar) {
            bar.innerHTML = '📄 Context: <strong>' + name + '</strong>';
            bar.style.display = 'flex';
        }
        // Clear chat and show new welcome
        chatBody.innerHTML = '';
        addMessage(`Context switched! 📄 You are now asking questions about "${name}". How can I help?`, 'ai');
    };
})();
</script>
