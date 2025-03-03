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

        const auth = firebase.auth();
        let currentUser = null;

        document.addEventListener('DOMContentLoaded', function() {
            // Verificar si el usuario está autenticado
            auth.onAuthStateChanged(async user => {
                if (user) {
                    currentUser = user;
                    console.log("Usuario autenticado:", user.uid);
                    
                    // Guardar el email del usuario en localStorage para uso futuro
                    localStorage.setItem('userEmail', user.email);
                    
                    // Cargar chats y sugerencias usando el servidor
                    await loadUserChats();
                    await loadSuggestedUsers();
                    
                    // Configurar búsqueda
                    setupSearch();
                } else {
                    console.log("No hay usuario autenticado");
                    window.location.href = 'login.html';
                }
            });
            
            // Configurar la búsqueda en tiempo real
            function setupSearch() {
                const searchInput = document.getElementById('search-input');
                searchInput.addEventListener('input', function() {
                    const searchTerm = this.value.toLowerCase().trim();
                    filterChats(searchTerm);
                });
            }
            
            // Filtrar chats según el término de búsqueda
            function filterChats(searchTerm) {
                const chatItems = document.querySelectorAll('.chat-item');
                
                chatItems.forEach(item => {
                    const chatName = item.querySelector('.chat-name').textContent.toLowerCase();
                    const lastMessage = item.querySelector('.chat-last-message').textContent.toLowerCase();
                    
                    if (chatName.includes(searchTerm) || lastMessage.includes(searchTerm)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
                
                // Mostrar mensaje si no hay resultados
                const visibleChats = document.querySelectorAll('.chat-item:not([style="display: none"])');
                const noChatsMessage = document.getElementById('no-chats-message');
                
                if (visibleChats.length === 0 && searchTerm !== '') {
                    noChatsMessage.style.display = 'flex';
                    noChatsMessage.querySelector('p').textContent = `No se encontraron resultados para "${searchTerm}"`;
                } else if (visibleChats.length === 0) {
                    noChatsMessage.style.display = 'flex';
                    noChatsMessage.querySelector('p').textContent = 'No tienes conversaciones activas';
                } else {
                    noChatsMessage.style.display = 'none';
                }
            }

            // Función para cargar los chats del usuario usando el servidor
            async function loadUserChats() {
                const chatsLoading = document.getElementById('chats-loading');
                const noChatsMessage = document.getElementById('no-chats-message');
                const chatsList = document.getElementById('chats-list');
                
                try {
                    // Obtener el token de autenticación
                    const token = await currentUser.getIdToken();
                    
                    // Hacer petición al servidor para obtener los chats
                    const response = await fetch('http://localhost:3000/api/chats', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Error al obtener los chats');
                    }
                    
                    const chats = await response.json();
                    
                    // Ocultar el indicador de carga
                    chatsLoading.style.display = 'none';
                    
                    if (chats.length === 0) {
                        // No hay chats, mostrar mensaje
                        noChatsMessage.style.display = 'flex';
                        return;
                    }
                    
                    // Hay chats, mostrar la lista
                    chatsList.innerHTML = '';
                    
                    for (const chat of chats) {
                        // Crear elemento de chat
                        const chatItem = document.createElement('li');
                        chatItem.className = 'chat-item';
                        chatItem.setAttribute('data-chat-id', chat.id);
                        chatItem.setAttribute('data-user-email', chat.otherUserEmail);
                        
                        // Determinar si hay mensajes no leídos
                        const unreadClass = chat.unreadCount > 0 ? 'unread' : '';
                        
                        chatItem.innerHTML = `
                            <div class="chat-avatar">
                                <img src="${chat.otherUserPhoto || '/img/default.png'}" alt="${chat.otherUserName}">
                                ${chat.otherUserOnline ? '<span class="online-indicator"></span>' : ''}
                            </div>
                            <div class="chat-details">
                                <div class="chat-header">
                                    <h3 class="chat-name">${chat.otherUserName}</h3>
                                    <span class="chat-time">${chat.lastMessageTime || ''}</span>
                                </div>
                                <p class="chat-last-message ${unreadClass}">${chat.lastMessage || 'No hay mensajes'}</p>
                                ${chat.unreadCount > 0 ? 
                                    `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                            </div>
                        `;
                        
                        // Añadir evento click para ir al chat
                        chatItem.addEventListener('click', () => {
                            window.location.href = `messages.html?chatId=${chat.id}&otherEmail=${chat.otherUserEmail}`;
                        });
                        
                        chatsList.appendChild(chatItem);
                    }
                } catch (error) {
                    console.error('Error al cargar los chats:', error);
                    chatsLoading.style.display = 'none';
                    chatsList.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error al cargar las conversaciones: ${error.message}</p>
                        </div>
                    `;
                }
            }
            
            // Función para cargar sugerencias de usuarios usando el servidor
            async function loadSuggestedUsers() {
                const suggestionsLoading = document.getElementById('suggestions-loading');
                const noSuggestionsMessage = document.getElementById('no-suggestions-message');
                const suggestedUsersList = document.getElementById('suggested-users-list');
                
                try {
                    // Obtener el token de autenticación
                    const token = await currentUser.getIdToken();
                    
                    // Hacer petición al servidor para obtener sugerencias de usuarios
                    const response = await fetch('http://localhost:3000/api/users/suggested', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Error al obtener sugerencias de usuarios');
                    }
                    
                    const users = await response.json();
                    
                    // Ocultar el indicador de carga
                    suggestionsLoading.style.display = 'none';
                    
                    if (users.length === 0) {
                        // No hay sugerencias, mostrar mensaje
                        noSuggestionsMessage.style.display = 'flex';
                        return;
                    }
                    
                    // Hay sugerencias, mostrar la lista
                    suggestedUsersList.innerHTML = '';
                    
                    for (const user of users) {
                        const userItem = document.createElement('li');
                        userItem.className = 'user-item';
                        userItem.setAttribute('data-user-email', user.email);
                        
                        // Obtener nombre para mostrar
                        const displayName = user.nombre && user.apellidos 
                            ? `${user.nombre} ${user.apellidos}` 
                            : user.email;
                        
                        userItem.innerHTML = `
                            <div class="user-avatar">
                                <img src="${user.foto || '/img/default.png'}" alt="${displayName}">
                                ${user.online ? '<span class="online-indicator"></span>' : ''}
                            </div>
                            <div class="user-details">
                                <h3 class="user-name">${displayName}</h3>
                                <p class="user-location">${user.localidad || 'Ubicación no disponible'}</p>
                            </div>
                             <button class="start-chat-btn">
                                <i class="fas fa-comment"></i> Chatear
                            </button>
                        `;
                        
                        // Añadir evento click para iniciar chat
                        userItem.querySelector('.start-chat-btn').addEventListener('click', () => {
                            startNewChat(currentUser.email, user.email);
                        });
                        
                        suggestedUsersList.appendChild(userItem);
                    }
                } catch (error) {
                    console.error('Error al cargar las sugerencias de usuarios:', error);
                    suggestionsLoading.style.display = 'none';
                    suggestedUsersList.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error al cargar sugerencias: ${error.message}</p>
                        </div>
                    `;
                }
            }
            
            // Función para iniciar un nuevo chat usando el servidor
            async function startNewChat(currentUserEmail, otherUserEmail) {
                try {
                    // Obtener el token de autenticación
                    const token = await currentUser.getIdToken();
                    
                    // Hacer petición al servidor para crear un nuevo chat
                    const response = await fetch('http://localhost:3000/api/chats/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            otherUserEmail: otherUserEmail
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error('Error al crear el chat');
                    }
                    
                    const data = await response.json();
                    
                    // Redirigir al chat recién creado
                    window.location.href = `messages.html?chatId=${data.chatId}&otherEmail=${otherUserEmail}`;
                    
                } catch (error) {
                    console.error('Error al crear nuevo chat:', error);
                    alert('Error al crear el chat. Por favor, inténtalo de nuevo.');
                }
            }
        });
