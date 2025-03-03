 // Configuración de Firebase
 const firebaseConfig = {
    apiKey: "AIzaSyBgf6uDmurevI9MSV-gGgR_EmNFWHILsWs",
    authDomain: "libros-9d5d4.firebaseapp.com",
    projectId: "libros-9d5d4",
    storageBucket: "libros-9d5d4.appspot.com",
    messagingSenderId: "802623661541",
    appId: "1:802623661541:web:5bce5122460c335c4ebb0c"
};

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Variables globales
let currentUser = null;
let currentChatId = null;
let currentOtheruserEmail = null;
let messagesListener = null;
let userStatusListener = null;

document.addEventListener("DOMContentLoaded", function() {
    const token = localStorage.getItem("token");

    if (!token) {
        // Si no hay token, redirigir a login
        window.location.replace("login.html");
    }
    // Verificar si el usuario está autenticado
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            
            // Comprobar si hay un chatId en la URL
            const urlParams = new URLSearchParams(window.location.search);
            const chatId = urlParams.get('chatId');
            const otherEmail = urlParams.get('otherEmail');
            
            // Guardar en variables globales
            currentChatId = chatId;
            currentOtherEmail = otherEmail;
            
            // Cargar los chats del usuario
            loadUserChats();
            
            // Si hay un chatId, abrir ese chat
            if (currentChatId && otherEmail) {
                openChat(currentChatId, otherEmail);
            }
            
            // Configurar evento para el botón de enviar
            setupSendButton();
        } else {
            // Redirigir al login si no hay usuario autenticado
            window.location.href = 'login.html';
        }
    });
});


// Cargar los chats del usuario actual
// Función para cargar los chats del usuario
async function loadUserChats() {
    const chatsLoading = document.getElementById('chats-loading');
    const noChatsMessage = document.getElementById('no-chats-message');
    const chatsList = document.getElementById('chats-list');
    
    // Verificar si los elementos existen
    if (!chatsList) {
        console.error('Elemento chats-list no encontrado');
        return;
    }
    
    try {
        const userEmail = currentUser.email;

        // Primera consulta más simple para evitar problemas de índice
        const chatsQuery = db.collection('chats')
            .where('participantes', 'array-contains', userEmail);
        
        chatsQuery.get().then(async (snapshot) => {
            // Ocultar el indicador de carga si existe
            if (chatsLoading) {
                chatsLoading.style.display = 'none';
            }
            
            if (snapshot.empty) {
                // No hay chats, mostrar mensaje si el elemento existe
                if (noChatsMessage) {
                    noChatsMessage.style.display = 'flex';
                }
                return;
            }
            
            // Hay chats, mostrar la lista
            chatsList.innerHTML = '';
            
            // Ordenar manualmente por lastMessageTime
            const chatsData = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                chatsData.push({
                    id: doc.id,
                    ...data,
                    lastMessageTime: data.lastMessageTime ? data.lastMessageTime.toDate() : new Date(0)
                });
            });
            
            // Ordenar por fecha de último mensaje (descendente)
            chatsData.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
            
            // Procesar los chats ordenados
            for (const chatData of chatsData) {
                // Obtener el otro participante
                const otherUserEmail = chatData.participantes.find(email => email !== userEmail);
                
                if (otherUserEmail) {
                    try {
                        // Obtener información del otro usuario
                        const userSnapshot = await db.collection('users')
                            .where('email', '==', otherUserEmail)
                            .get();
                        
                        let otherUserName = otherUserEmail;
                        let otherUserPhoto = 'img/default.png';
                        let otherUserOnline = false;
                        
                        if (!userSnapshot.empty) {
                            const userData = userSnapshot.docs[0].data();
                            otherUserName = userData.nombre && userData.apellidos 
                                ? `${userData.nombre} ${userData.apellidos}` 
                                : otherUserEmail;
                            otherUserPhoto = userData.foto || 'img/default.png';
                            otherUserOnline = userData.online || false;
                        }
                        
                        // Formatear la hora del último mensaje
                        let formattedTime = '';
                        if (chatData.lastMessageTime) {
                            formattedTime = formatMessageTime(chatData.lastMessageTime);
                        }
                        
                        // Obtener el recuento de mensajes no leídos
                        const unreadCount = chatData.unreadCount && chatData.unreadCount[userEmail] 
                            ? chatData.unreadCount[userEmail] 
                            : 0;
                        
                        // Crear elemento de chat
                        const chatItem = document.createElement('li');
                        chatItem.className = 'chat-item';
                        chatItem.setAttribute('data-chat-id', chatData.id);
                        chatItem.setAttribute('data-user-email', otherUserEmail);
                        
                        // Determinar si hay mensajes no leídos
                        const unreadClass = unreadCount > 0 ? 'unread' : '';
                        
                        chatItem.innerHTML = `
                            <div class="chat-avatar">
                                <img src="${otherUserPhoto}" alt="${otherUserName}" onerror="this.src='img/default.png'">
                                ${otherUserOnline ? '<span class="online-indicator"></span>' : ''}
                            </div>
                            <div class="chat-details">
                                <div class="chat-header">
                                    <h3 class="chat-name">${otherUserName}</h3>
                                    <span class="chat-time">${formattedTime}</span>
                                </div>
                                <p class="chat-last-message ${unreadClass}">${chatData.lastMessage || 'No hay mensajes'}</p>
                                ${unreadCount > 0 ? 
                                    `<span class="unread-badge">${unreadCount}</span>` : ''}
                            </div>
                        `;
                        
                        // Añadir evento click para ir al chat
                        // Modificar el evento click para los elementos de chat
                    chatItem.addEventListener('click', async () => {
                        // Ocultar visualmente el badge antes de cambiar de página
                        const unreadBadge = chatItem.querySelector('.unread-badge');
                        if (unreadBadge) {
                            unreadBadge.classList.add('hidden');
                        }
                        
                        // Quitar la clase 'unread' del último mensaje
                        const lastMessage = chatItem.querySelector('.chat-last-message');
                        if (lastMessage) {
                            lastMessage.classList.remove('unread');
                        }
                        
                        // Navegar al chat
                        window.location.href = `messages.html?chatId=${chatData.id}&otherEmail=${otherUserEmail}`;
                    });

                        
                        chatsList.appendChild(chatItem);
                    } catch (userError) {
                        console.error('Error al cargar información del usuario:', userError);
                    }
                }
            }
            
            // Si no hay chats después de procesar, mostrar mensaje
            if (chatsList.children.length === 0) {
                noChatsMessage.style.display = 'flex';
            } else {
                noChatsMessage.style.display = 'none';
            }
        }).catch(error => {
            console.error('Error al cargar los chats:', error);
            chatsLoading.style.display = 'none';
            
            // Si el error es de índice, mostrar un mensaje específico
            if (error.message.includes('index')) {
                chatsList.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Se está creando un índice para esta consulta. Por favor, espera unos minutos e inténtalo de nuevo.</p>
                        <button id="retry-chats" class="retry-button">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                `;
            } else {
                chatsList.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error al cargar las conversaciones: ${error.message}</p>
                        <button id="retry-chats" class="retry-button">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                `;
            }
            
            // Añadir evento para reintentar
            document.getElementById('retry-chats').addEventListener('click', loadUserChats);
        });
    } catch (error) {
        console.error('Error al configurar la consulta de chats:', error);
        chatsLoading.style.display = 'none';
        chatsList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error al cargar las conversaciones: ${error.message}</p>
                <button id="retry-chats" class="retry-button">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
        
        // Añadir evento para reintentar
        document.getElementById('retry-chats').addEventListener('click', loadUserChats);
    }
}

// Función para formatear la hora del mensaje
function formatMessageTime(timestamp) {
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    // Si es hoy, mostrar solo la hora
    if (messageDate.toDateString() === now.toDateString()) {
        return messageDate.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Si es ayer
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
        return 'Ayer';
    }
    
    // Si es esta semana, mostrar el día
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const daysDiff = (now - messageDate) / (1000 * 60 * 60 * 24);
    if (daysDiff < 7) {
        return daysOfWeek[messageDate.getDay()];
    }
    
    // Si es otro día, mostrar fecha corta
    return messageDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
}

// Abrir un chat específico
// Modificar la función openChat para que también actualice visualmente el badge
async function openChat(currentChatId, otherEmail) {
    // Limpiar listeners anteriores
    if (messagesListener) {
        messagesListener();
    }
    if (userStatusListener) {
        userStatusListener();
    }
    
    // Actualizar variables globales
    currentChatId = currentChatId;
    currentOtherEmail = otherEmail;
    
    // Obtener el elemento chat-box y verificar si existe
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) {
        console.error('Elemento chat-box no encontrado');
        return;
    }
    
    // Actualizar UI para mostrar que se está cargando
    chatBox.innerHTML = `
        <div id="messages-loading" class="loading-indicator">
            <div class="spinner"></div>
            <p>Cargando mensajes...</p>
        </div>
    `;
    
    // Habilitar el input y botón de enviar si existen
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    if (messageInput) {
        messageInput.disabled = false;
    }
    
    if (sendButton) {
        sendButton.disabled = false;
    }
    
    try {
        // Cargar información del otro usuario
        const userSnapshot = await db.collection('users')
            .where('email', '==', otherEmail)
            .get();
        
        if (userSnapshot.empty) {
            console.error('Usuario no encontrado');
            return;
        }
        
        const userData = userSnapshot.docs[0].data();
        const otheruserEmail = userSnapshot.docs[0].id;
        
        // Actualizar interfaz con datos del usuario
        document.getElementById('chat-user-avatar').src = userData.foto || 'img/default.png';
        
        // Mostrar nombre completo o email
        const displayName = userData.nombre && userData.apellidos 
            ? `${userData.nombre} ${userData.apellidos}`
            : otherEmail;
        document.getElementById('chat-user-name').textContent = displayName;
        
        // Mostrar estado online/offline
        updateUserStatus(userData);
        
        // Configurar listener para cambios en el estado del usuario
        userStatusListener = db.collection('users').doc(otheruserEmail)
            .onSnapshot(doc => {
                if (doc.exists) {
                    updateUserStatus(doc.data());
                }
            });
        
        // Marcar mensajes como leídos
        await markMessagesAsRead(currentChatId, currentUser.email);
        
        // NUEVO: Eliminar visualmente el badge de no leídos para este chat
        const chatItem = document.querySelector(`.chat-item[data-chat-id="${currentChatId}"]`);
        if (chatItem) {
            const unreadBadge = chatItem.querySelector('.unread-badge');
            if (unreadBadge) {
                unreadBadge.style.display = 'none';
            }
            
            // También eliminar la clase 'unread' del último mensaje
            const lastMessage = chatItem.querySelector('.chat-last-message');
            if (lastMessage) {
                lastMessage.classList.remove('unread');
            }
        }
        
        // Configurar listener para nuevos mensajes
        messagesListener = db.collection('chats').doc(currentChatId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                renderMessages(snapshot);
                // Marcar mensajes como leídos cuando se reciben nuevos
                markMessagesAsRead(currentChatId, currentUser.email);
            });
        
        // Resaltar el chat seleccionado en la lista
        document.querySelectorAll('.chat-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-chat-id') === currentChatId) {
                link.classList.add('active');
            }
        });
        
    } catch (error) {
        console.error('Error al abrir el chat:', error);
        document.getElementById('chat-box').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error al cargar el chat</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}



// Función para cargar los mensajes del chat
async function loadChatMessages() {
    const chatBox = document.getElementById('chat-box');
    const loadingIndicator = document.getElementById('loading-messages');
    
    if (!chatBox) {
        console.error('Elemento chat-box no encontrado');
        return;
    }
 
    if (!currentChatId) {
        console.error('No hay un chat seleccionado');
        return;
    }
    
    try {
        // Verificar si el chat existe y si el usuario tiene acceso
        const chatDoc = await db.collection('chats').doc(currentChatId).get();
        
        if (!chatDoc.exists) {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            chatBox.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Este chat no existe o ha sido eliminado.</p>
                    <a href="chats_list.html" class="back-button">
                        <i class="fas fa-arrow-left"></i> Volver a mis chats
                    </a>
                </div>
            `;
            return;
        }
        
        const chatData = chatDoc.data();
        
        // Verificar si el usuario es participante
        if (!chatData.participantes.includes(currentUser.email)) {
            loadingIndicator.style.display = 'none';
            messagesContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-lock"></i>
                    <p>No tienes acceso a este chat.</p>
                    <a href="chats_list.html" class="back-button">
                        <i class="fas fa-arrow-left"></i> Volver a mis chats
                    </a>
                </div>
            `;
            return;
        }
        
        // Obtener los mensajes una sola vez (sin onSnapshot por ahora)
        const messagesQuery = await db.collection('chats').doc(currentChatId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .get();
        
        loadingIndicator.style.display = 'none';
        
        if (messagesQuery.empty) {
            messagesContainer.innerHTML = `
                <div class="empty-chat-message">
                    <i class="fas fa-comments"></i>
                    <p>No hay mensajes aún. ¡Envía el primero!</p>
                </div>
            `;
            return;
        }
        
        messagesContainer.innerHTML = '';
        
        // Procesar los mensajes
        messagesQuery.forEach(doc => {
            const messageData = doc.data();
            const messageId = doc.id;
            
            const messageElement = createMessageElement(messageData, messageId);
            messagesContainer.appendChild(messageElement);
            
            // Marcar como leído si es necesario
            if (messageData.sender !== currentUser.email && !messageData.read) {
                markMessageAsRead(messageId);
            }
        });
        
        // Desplazarse al último mensaje
        scrollToBottom();
        
        // Actualizar el contador de mensajes no leídos
        updateUnreadCount();
        
        // Una vez que todo funciona, intentar configurar la escucha en tiempo real
        setupRealtimeMessages();
        
    } catch (error) {
        console.error("Error al cargar los mensajes:", error);
        loadingIndicator.style.display = 'none';
        messagesContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error al cargar los mensajes: ${error.message}</p>
                <button id="retry-messages" class="retry-button">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
        
        // Añadir evento para reintentar
        document.getElementById('retry-messages').addEventListener('click', loadChatMessages);
    }
}

// Configurar escucha en tiempo real para nuevos mensajes
function setupRealtimeMessages() {
    try {
        const messagesRef = db.collection('chats').doc(currentChatId).collection('messages')
        .orderBy('timestamp', 'asc');
        
        // Usar onSnapshot para escuchar nuevos mensajes
        const unsubscribe = messagesRef.onSnapshot((snapshot) => {
            const messagesContainer = document.getElementById('messages-container');
            const wasAtBottom = isScrolledToBottom();
            
            // Procesar solo los cambios
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const messageData = change.doc.data();
                    const messageId = change.doc.id;
                    
                    // Verificar si el mensaje ya existe en el DOM
                    if (!document.getElementById(`message-${messageId}`)) {
                        const messageElement = createMessageElement(messageData, messageId);
                        messagesContainer.appendChild(messageElement);
                        
                        // Mostrar notificación si el mensaje es nuevo, no es del usuario actual y la ventana no está activa
                        if (messageData.sender !== currentUser.email && 
                            messageData.timestamp && 
                            (new Date() - messageData.timestamp.toDate()) < 10000 &&
                            !document.hasFocus()) {
                            
                            // Obtener información del remitente para la notificación
                            db.collection('users').where('email', '==', messageData.sender).get()
                                .then(snapshot => {
                                    if (!snapshot.empty) {
                                        const userData = snapshot.docs[0].data();
                                        const userName = userData.nombre && userData.apellidos ? 
                                            `${userData.nombre} ${userData.apellidos}` : messageData.sender;
                                        const userPhoto = userData.foto || 'img/default.png';
                                        
                                        // Mostrar notificación
                                        showNotification(
                                            userName, 
                                            messageData.text, 
                                            userPhoto,
                                            function() {
                                                // Al hacer clic, enfocar la ventana y abrir el chat
                                                window.focus();
                                                openChat(currentChatId, messageData.sender);
                                            }
                                        );
                                    }
                                });
                        }
                        
                        // Reproducir sonido si el mensaje es nuevo y no es del usuario actual
                        if (messageData.sender !== currentUser.email && 
                            messageData.timestamp && 
                            (new Date() - messageData.timestamp.toDate()) < 10000) {
                            playMessageSound();
                        }
                        
                        // Marcar como leído si es necesario
                        if (messageData.sender !== currentUser.email && !messageData.read) {
                            markMessageAsRead(messageId);
                        }
                    }
                } else if (change.type === 'modified') {
                    // Actualizar el mensaje existente (por ejemplo, el estado de lectura)
                    const messageData = change.doc.data();
                    const messageId = change.doc.id;
                    const messageElement = document.getElementById(`message-${messageId}`);
                    
                    if (messageElement && messageData.sender === currentUser.email) {
                        const statusSpan = messageElement.querySelector('.message-status');
                        if (statusSpan) {
                            statusSpan.innerHTML = messageData.read ? 
                                '<i class="fas fa-check-double"></i>' : 
                                '<i class="fas fa-check"></i>';
                        }
                    }
                }
            });
            
            // Si estaba en la parte inferior antes de los nuevos mensajes, desplazarse hacia abajo
            if (wasAtBottom) {
                scrollToBottom();
            }
            
        }, (error) => {
            console.error("Error en la escucha en tiempo real:", error);
            // No mostrar error en la UI, ya que los mensajes iniciales ya se cargaron
        });
        
        // Guardar la función de cancelación para limpiar al salir
        window.chatUnsubscribe = unsubscribe;
    } catch (error) {
        console.error("Error al configurar la escucha en tiempo real:", error);
    }
}


// Función para crear un elemento de mensaje
function createMessageElement(messageData, messageId) {
    const messageDiv = document.createElement('div');
    messageDiv.id = `message-${messageId}`;
    messageDiv.className = messageData.sender === currentUser.email ? 'message sent' : 'message received';
    
    // Formatear la hora
    let formattedTime = '';
    if (messageData.timestamp) {
        const messageDate = messageData.timestamp.toDate();
        formattedTime = messageDate.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Crear el contenido del mensaje
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${messageData.text}</p>
            <span class="message-time">${formattedTime}</span>
            ${messageData.sender === currentUser.email ? 
                `<span class="message-status">${messageData.read ? 
                    '<i class="fas fa-check-double"></i>' : 
                    '<i class="fas fa-check"></i>'}</span>` : ''}
        </div>
    `;
    
    return messageDiv;
}

// Función para marcar un mensaje como leído
async function markMessageAsRead(messageId) {
    try {
        await db.collection('chats').doc(currentChatId).collection('messages').doc(messageId).update({
            read: true
        });
    } catch (error) {
        console.error("Error al marcar mensaje como leído:", error);
    }
}

// Función para actualizar el contador de mensajes no leídos
async function updateUnreadCount() {
    try {
        const chatRef = db.collection('chats').doc(currentChatId);
        const chatDoc = await chatRef.get();
        
        if (chatDoc.exists) {
            const chatData = chatDoc.data();
            const unreadCount = chatData.unreadCount || {};
            
            // Restablecer el contador para el usuario actual
            unreadCount[currentUser.email] = 0;
            
            await chatRef.update({
                unreadCount: unreadCount
            });
        }
    } catch (error) {
        console.error("Error al actualizar contador de mensajes no leídos:", error);
    }
}

// Función para verificar si el scroll está en la parte inferior
function isScrolledToBottom() {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return true; // Si no existe, asumimos que está en el fondo
    
    const threshold = 50; // píxeles de margen
    return chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < threshold;
}

// Función para desplazarse al último mensaje
function scrollToBottom() {
    const chatBox = document.getElementById('chat-box');
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// Función para reproducir un sonido cuando llega un nuevo mensaje
function playMessageSound() {
    try {
        const sound = new Audio('sounds/message.mp3');
        sound.volume = 0.5;
        sound.play();
    } catch (error) {
        console.error("Error al reproducir sonido:", error);
    }
}

// Función para enviar un mensaje
// Función para enviar un mensaje
async function sendMessage(text) {
    if (!text.trim()) return;
    
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    // Verificar que currentChatId esté definido
    if (!currentChatId) {
        console.error("No hay un chat seleccionado");
        alert("Error: No hay un chat seleccionado");
        return;
    }
    
    // Deshabilitar la entrada y el botón mientras se envía
    messageInput.disabled = true;
    sendButton.disabled = true;
    
    try {
        // Crear el objeto de mensaje
        const messageData = {
            text: text.trim(),
            sender: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        };
        
        // Añadir el mensaje a la colección
        await db.collection('chats').doc(currentChatId).collection('messages').add(messageData);
        
        // Actualizar el último mensaje en el documento del chat
        const otherUserEmail = currentOtherEmail || new URLSearchParams(window.location.search).get('otherEmail');
        
        const updateData = {
            lastMessage: text.trim(),
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Incrementar el contador de mensajes no leídos para el otro usuario
        if (otherUserEmail) {
            const chatDoc = await db.collection('chats').doc(currentChatId).get();
            const chatData = chatDoc.data() || {};
            const unreadCount = chatData.unreadCount || {};
            
            // Incrementar el contador para el otro usuario
            unreadCount[otherUserEmail] = (unreadCount[otherUserEmail] || 0) + 1;
            updateData.unreadCount = unreadCount;
        }
        
        // Actualizar el documento del chat
        await db.collection('chats').doc(currentChatId).update(updateData);
        
        // Limpiar el campo de entrada
        messageInput.value = '';
        
    } catch (error) {
        console.error("Error al enviar mensaje:", error);
        alert("Error al enviar el mensaje. Por favor, inténtalo de nuevo.");
    } finally {
        // Habilitar la entrada y el botón
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Configurar el evento de envío de mensajes
document.addEventListener('DOMContentLoaded', function() {

    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    // No necesitas buscar un formulario que no existe en tu HTML
    
    if (sendButton && messageInput) {
        // Evento click para el botón de enviar
        sendButton.addEventListener('click', function() {
            sendMessage(messageInput.value);
        });
        
        // Enviar con Enter (pero permitir nueva línea con Shift+Enter)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(messageInput.value);
            }
        });
        
        // Ajustar altura automáticamente
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    // Limpiar la escucha al salir de la página
    window.addEventListener('beforeunload', function() {
        if (window.chatUnsubscribe) {
            window.chatUnsubscribe();
        }
    });
});


// Función para crear un elemento de mensaje
function createMessageElement(messageData, messageId) {
    const messageDiv = document.createElement('div');
    messageDiv.id = `message-${messageId}`;
    messageDiv.className = messageData.sender === currentUser.email ? 'message sent' : 'message received';
    
    // Formatear la hora
    let formattedTime = '';
    if (messageData.timestamp) {
        const messageDate = messageData.timestamp.toDate();
        formattedTime = messageDate.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Crear el contenido del mensaje
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${messageData.text}</p>
            <span class="message-time">${formattedTime}</span>
            ${messageData.sender === currentUser.email ? 
                `<span class="message-status">${messageData.read ? 
                    '<i class="fas fa-check-double"></i>' : 
                    '<i class="fas fa-check"></i>'}</span>` : ''}
        </div>
    `;
    
    return messageDiv;
}

// Función para marcar un mensaje como leído
async function markMessageAsRead(messageId) {
    try {
        await db.collection('chats').doc(currentChatId).collection('messages').doc(messageId).update({
            read: true
        });
        
        // También actualizar el contador de mensajes no leídos
        const chatRef = db.collection('chats').doc(currentChatId);
        const chatDoc = await chatRef.get();
        
        if (chatDoc.exists) {
            const chatData = chatDoc.data();
            const unreadCount = chatData.unreadCount || {};
            
            // Restablecer el contador para el usuario actual
            unreadCount[currentUser.email] = 0;
            
            await chatRef.update({
                unreadCount: unreadCount
            });
        }
    } catch (error) {
        console.error("Error al marcar mensaje como leído:", error);
    }
}

// Función para actualizar el contador de mensajes no leídos
async function updateUnreadCount() {
    try {
        const chatRef = db.collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();
        
        if (chatDoc.exists) {
            const chatData = chatDoc.data();
            const unreadCount = chatData.unreadCount || {};
            
            // Restablecer el contador para el usuario actual
            unreadCount[currentUser.email] = 0;
            
            await chatRef.update({
                unreadCount: unreadCount
            });
        }
    } catch (error) {
        console.error("Error al actualizar contador de mensajes no leídos:", error);
    }
}
        
// Renderizar mensajes en la interfaz
function renderMessages(snapshot) {
    const chatBox = document.getElementById('chat-box');
    
    // Limpiar el chat box
    chatBox.innerHTML = '';
    
    if (snapshot.empty) {
        // No hay mensajes
        const noMessages = document.createElement('div');
        noMessages.className = 'empty-state';
        noMessages.innerHTML = `
            <i class="fas fa-comment-slash"></i>
            <p>No hay mensajes</p>
            <p class="sub-text">Envía el primer mensaje para iniciar la conversación</p>
        `;
        chatBox.appendChild(noMessages);
        return;
    }
    
    // Agrupar mensajes por fecha
    let currentDate = null;
    
    snapshot.forEach(doc => {
        const messageData = doc.data();
        const messageId = doc.id;
        
        // Verificar si el mensaje tiene timestamp
        if (!messageData.timestamp) {
            console.warn('Mensaje sin timestamp:', messageId);
            return;
        }
        
        const messageDate = messageData.timestamp.toDate();
        const messageDay = messageDate.toLocaleDateString();
        
        // Si cambia el día, mostrar separador de fecha
        if (messageDay !== currentDate) {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'date-separator';
            dateDiv.textContent = formatDateSeparator(messageDate);
            chatBox.appendChild(dateDiv);
            currentDate = messageDay;
        }
        
        // Crear elemento de mensaje
        const messageElement = document.createElement('div');
        // Usar sender en lugar de senderId para comparar con el email del usuario actual
        messageElement.className = `chat-message ${messageData.sender === currentUser.email ? 'sent' : 'received'}`;
        messageElement.id = `message-${messageId}`;
        
        // Formatear la hora del mensaje
        const messageTime = formatTime(messageDate);
        
        // Contenido del mensaje
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${messageData.text}</p>
                <span class="message-time">${messageTime}</span>
                ${messageData.sender === currentUser.email ? 
                    `<span class="message-status">
                        ${messageData.read ? 
                            '<i class="fas fa-check-double read"></i>' : 
                            '<i class="fas fa-check"></i>'}
                    </span>` : ''
                }
            </div>
        `;
        
        chatBox.appendChild(messageElement);
    });
    
    // Scroll al final del chat
    chatBox.scrollTop = chatBox.scrollHeight;
}


// Configurar el botón de enviar
function setupSendButton() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    if (!messageInput || !sendButton) {
        console.error('Elementos de entrada de mensajes no encontrados');
        return;
    }
    
    // Eliminar eventos anteriores para evitar duplicados
    sendButton.replaceWith(sendButton.cloneNode(true));
    const newSendButton = document.getElementById('send-button');
    
    // Evento click para el botón de enviar
    newSendButton.addEventListener('click', function() {
        sendMessage(messageInput.value);
    });
    
    // Eliminar eventos anteriores para evitar duplicados
    messageInput.replaceWith(messageInput.cloneNode(true));
    const newMessageInput = document.getElementById('message-input');
    
    // Evento para enviar con Enter
    newMessageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(this.value);
        }
    });
}

// Mejorar la función markMessagesAsRead para que actualice también la UI
async function markMessagesAsRead(chatId, userEmail) {
    try {
        // Obtener mensajes no leídos enviados por el otro usuario
        const unreadMessages = await db.collection('chats').doc(chatId)
            .collection('messages')
            .where('sender', '!=', userEmail)  // Corregido: usar sender en lugar de senderId
            .where('read', '==', false)
            .get();
        
        // Si no hay mensajes no leídos, salir
        if (unreadMessages.empty) {
            return;
        }
        
        // Batch para actualizar múltiples documentos
        const batch = db.batch();
        
        // Marcar cada mensaje como leído
        unreadMessages.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        
        // Resetear contador de no leídos para el usuario actual
        batch.update(db.collection('chats').doc(chatId), {
            [`unreadCount.${userEmail}`]: 0
        });
        
        // Ejecutar batch
        await batch.commit();
        
        // NUEVO: Actualizar visualmente el elemento de chat en la lista
        const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (chatItem) {
            // Ocultar el badge de no leídos
            const unreadBadge = chatItem.querySelector('.unread-badge');
            if (unreadBadge) {
                unreadBadge.style.display = 'none';
            }
            
            // Quitar la clase 'unread' del último mensaje
            const lastMessage = chatItem.querySelector('.chat-last-message');
            if (lastMessage) {
                lastMessage.classList.remove('unread');
            }
        }
        
    } catch (error) {
        console.error('Error al marcar mensajes como leídos:', error);
    }
}


// Actualizar estado del usuario en la interfaz
function updateUserStatus(userData) {
    const onlineIndicator = document.getElementById('online-indicator');
    const statusText = document.getElementById('chat-user-status');
    
    if (userData.online) {
        onlineIndicator.style.display = 'block';
        statusText.textContent = 'En línea';
        statusText.classList.add('online');
    } else {
        onlineIndicator.style.display = 'none';
        
        if (userData.lastSeen) {
            const lastSeen = userData.lastSeen.toDate();
            statusText.textContent = `Última vez: ${formatLastSeen(lastSeen)}`;
        } else {
            statusText.textContent = 'Desconectado';
        }
        
        statusText.classList.remove('online');
    }
}

// Formatear hora del mensaje (HH:MM)
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Formatear fecha para separadores (Hoy, Ayer, o fecha completa)
function formatDateSeparator(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ayer';
    } else {
        return date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

// Formatear última vez visto
function formatLastSeen(date) {
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) {
        return 'hace un momento';
    } else if (diffMinutes < 60) {
        return `hace ${diffMinutes} minutos`;
    } else if (diffMinutes < 24 * 60) {
        const hours = Math.floor(diffMinutes / 60);
        return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else {
        return date.toLocaleDateString('es-ES', { 
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Función para crear un nuevo chat
async function createNewChat(otheruserEmail) {
    try {
        // Comprobar si ya existe un chat entre estos usuarios
        const existingChatsQuery = await db.collection('chats')
            .where('participants', 'array-contains', currentUser.uid)
            .get();
        
        let existingcurrentChatId = null;
        
        existingChatsQuery.forEach(doc => {
            const chatData = doc.data();
            if (chatData.participants.includes(otheruserEmail)) {
                existingcurrentChatId = doc.id;
            }
        });
        
        // Si ya existe un chat, abrirlo
        if (existingcurrentChatId) {
            openChat(existingcurrentChatId, otheruserEmail);
            return existingcurrentChatId;
        }
        
        // Si no existe, crear nuevo chat
        const newChatRef = await db.collection('chats').add({
            participants: [currentUser.uid, otheruserEmail],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: "",
            unreadCount: {
                [currentUser.uid]: 0,
                [otheruserEmail]: 0
            }
        });
        
        // Abrir el nuevo chat
        openChat(newChatRef.id, otheruserEmail);
        
        // Actualizar la lista de chats
        loadUserChats(currentUser.uid);
        
        return newChatRef.id;
        
    } catch (error) {
        console.error('Error al crear nuevo chat:', error);
        alert('Error al crear el chat. Por favor, inténtalo de nuevo.');
        return null;
    }
}

// Función para solicitar permiso para notificaciones
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Este navegador no soporta notificaciones");
        return false;
    }
    
    if (Notification.permission === "granted") {
        return true;
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
            return permission === "granted";
        });
    }
    return Notification.permission === "granted";
}

// Solicitar permiso cuando se carga la página
document.addEventListener("DOMContentLoaded", function() {
    requestNotificationPermission();
});


// Función para mostrar una notificación
function showNotification(title, body, icon, clickCallback) {
// Verificar si las notificaciones están permitidas
if (Notification.permission !== "granted") {
requestNotificationPermission();
return;
}

// Crear y mostrar la notificación
const notification = new Notification(title, {
body: body,
icon: icon || 'img/favicon.ico',
badge: 'img/favicon.ico',
vibrate: [200, 100, 200]
});

// Reproducir sonido de notificación
playNotificationSound();

// Manejar clic en la notificación
if (clickCallback) {
notification.onclick = clickCallback;
}

// Cerrar automáticamente después de 5 segundos
setTimeout(() => {
notification.close();
}, 5000);
}

// Función para reproducir sonido de notificación
function playNotificationSound() {
try {
    const sound = new Audio('sounds/notification.mp3');
    sound.volume = 0.5;
    sound.play();
} catch (error) {
    console.error("Error al reproducir sonido de notificación:", error);
}
}
