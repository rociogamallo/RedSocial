document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem("token");

    if (!token) {
        // Si no hay token, redirigir a login
        window.location.replace("login.html");
    }

    try {
        const response = await fetch('http://localhost:3000/perfil', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('profileImage').src = data.foto || '/default.png';
            const nombreUsuario = data.mote && data.mote.trim() !== "" ? data.mote : `${data.nombre} ${data.apellidos}`;
            document.getElementById('nombre').textContent = nombreUsuario;
            document.getElementById('descripcion').textContent = data.descripcion;
            document.getElementById('localidad').textContent = data.localidad;

            actualizarListaLibros(data.libros, data.uid, token);
        } else {
            alert('Error al cargar el perfil: ' + data.message);
        }
    } catch (error) {
        console.error('Error al obtener el perfil:', error);
    }
});

function interesado(libroId, token) {
    fetch(`http://localhost:3000/interesado/${libroId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        alert('Te has interesado por este libro!');
        window.location.href = `chats.html?email=${data.email}`;
    });
}

function borrarLibro(tituloLibro, token) {
    if (!token) {
        console.error('No tienes sesión iniciada');
        return;
    }

    fetch(`http://localhost:3000/borrarLibro/${encodeURIComponent(tituloLibro)}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Error al borrar el libro');
        return response.json();
    })
    .then(data => {
        alert('Libro eliminado');
        obtenerPerfil(token);
    })
    .catch(error => console.error('Error al eliminar el libro:', error));
}

function actualizarListaLibros(libros, userId, token) {
    const booksList = document.getElementById('booksList');
    booksList.innerHTML = "";  

    libros.forEach(libro => {
        const isOwner = libro.ownerId === userId;

        const bookCard = document.createElement('div');
        bookCard.classList.add('book-card');

        const bookDetails = document.createElement('div');
        bookDetails.classList.add('book-info-header');
        bookDetails.innerHTML = `
            <h5>${libro.titulo} - ${libro.autor}</h5>
            <i class="fas fa-caret-down"></i>
        `;
        bookDetails.addEventListener('click', () => {
            const details = bookCard.querySelector('.book-info');
            details.classList.toggle('d-none');
        });

        const bookInfo = document.createElement('div');
        bookInfo.classList.add('book-info', 'd-none');
        bookInfo.innerHTML = `
            <img src="${libro.imagen}" alt="Imagen del libro">
            <div class="book-info-text">
                <p><strong>Género:</strong> ${libro.genero}</p>
                <p><strong>Estado:</strong> ${libro.estado}</p>
                <p><strong>Opinión:</strong> ${libro.resumen}</p>
            </div>
        `;

        const bookActions = document.createElement('div');
        bookActions.classList.add('book-actions');
        bookActions.innerHTML = `
            ${isOwner ? 
                `<button class="btn btn-danger" onclick="borrarLibro('${libro.titulo}', '${token}')">Borrar</button>` :
                `<button class="btn btn-success" onclick="interesado('${libro.titulo}', '${token}')">Lo quiero</button>`}
        `;

        bookCard.appendChild(bookDetails);
        bookCard.appendChild(bookInfo);
        bookCard.appendChild(bookActions);

        booksList.appendChild(bookCard);
    });
}

function obtenerPerfil(token) {
    fetch('http://localhost:3000/perfil', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => actualizarListaLibros(data.libros, data.uid, token))
    .catch(error => console.error('Error al actualizar la lista de libros:', error));
}
