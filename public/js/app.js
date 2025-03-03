document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    if (!token) {
        // Si no hay token, redirigir a login
        window.location.replace("login.html");
    }
    let booksData = [];

    // 📚 Cargar libros al iniciar
    loadBooks();

    async function loadBooks() {
        try {
            const response = await fetch("http://localhost:3000/libros");
            booksData = await response.json();
            displayBooks(booksData);
        } catch (error) {
            console.error("Error cargando libros:", error);
        }
    }

    function displayBooks(books) {
        const booksGrid = document.querySelector(".books-grid");
        booksGrid.innerHTML = ""; // Limpiar antes de agregar nuevos libros

        const userEmail = localStorage.getItem("userEmail"); // Obtener el email del usuario logueado desde el token

        books.forEach(book => {
            if (!book.titulo || book.email === userEmail) {
                return; // No mostrar el libro si no tiene título o es del usuario logueado
            }

            const bookCard = document.createElement("div");
            bookCard.classList.add("book-card");

            bookCard.innerHTML = `
                <div class="book-cover" style="background-image: url('${book.portada || '/img/default.png'}')"></div>
                <div class="book-info">
                    <div class="book-title">${book.titulo}</div>
                    <div class="book-author">${book.autor}</div>
                    <a href="#" class="request-btn" data-owner-email="${book.email}">Solicitar intercambio</a>
                </div>
            `;

            booksGrid.appendChild(bookCard);
        });
    }

    // 🔍 Buscar libros en tiempo real
    document.querySelector("#searchInput").addEventListener("input", async function () {
        const searchTerm = this.value.toLowerCase();
        
        if (searchTerm === "") {
            displayBooks(booksData); // Si está vacío, mostrar todos
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/buscar?q=${searchTerm}`);
            const filteredBooks = await response.json();
            displayBooks(filteredBooks);
        } catch (error) {
            console.error("Error en la búsqueda:", error);
        }
    });

    // 🎯 Filtrar por categorías
    document.querySelectorAll(".category-tag").forEach(category => {
        category.addEventListener("click", function () {
            document.querySelectorAll(".category-tag").forEach(tag => tag.classList.remove("active"));
            this.classList.add("active");

            const selectedCategory = this.innerText;
            if (selectedCategory === "Todos") {
                displayBooks(booksData);
            } else {
                const filteredBooks = booksData.filter(book => book.genero === selectedCategory);
                displayBooks(filteredBooks);
            }
        });
    });

    // Evento para solicitar intercambio
    document.addEventListener("click", function(event) {
        if (event.target.classList.contains('request-btn')) {
            event.preventDefault();
            
            const ownerEmail = event.target.getAttribute('data-owner-email');
            const userEmail = localStorage.getItem("userEmail");
            
            if (!userEmail) {
                alert("Debes iniciar sesión para solicitar un libro");
                window.location.href = "login.html";
                return;
            }
            
            startChatWithUser(userEmail, ownerEmail);
        }
    });

    // Función para iniciar chat con otro usuario
    async function startChatWithUser(currentUserEmail, otherUserEmail) {
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyBgf6uDmurevI9MSV-gGgR_EmNFWHILsWs",
                authDomain: "libros-9d5d4.firebaseapp.com",
                projectId: "libros-9d5d4",
                storageBucket: "libros-9d5d4.appspot.com",
                messagingSenderId: "802623661541",
                appId: "1:802623661541:web:5bce5122460c335c4ebb0c"
            };            

            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            const db = firebase.firestore();
            
            const existingChatsQuery = await db.collection('chats')
                .where('participantes', 'array-contains', currentUserEmail)
                .get();
            
            let existingChatId = null;
            
            existingChatsQuery.forEach(doc => {
                const chatData = doc.data();
                if (chatData.participantes.includes(otherUserEmail)) {
                    existingChatId = doc.id;
                }
            });
            
            if (existingChatId) {
                window.location.href = `messages.html?chatId=${existingChatId}&otherEmail=${otherUserEmail}`;
                return;
            }
            
            const newChatRef = await db.collection('chats').add({
                participantes: [currentUserEmail, otherUserEmail],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: "",
                unreadCount: {
                    [currentUserEmail]: 0,
                    [otherUserEmail]: 0
                }
            });

            window.location.href = `messages.html?chatId=${newChatRef.id}&otherEmail=${otherUserEmail}`;
            
        } catch (error) {
            console.error('Error al crear nuevo chat:', error);
            alert('Error al crear el chat. Por favor, inténtalo de nuevo.');
        }
    }
});