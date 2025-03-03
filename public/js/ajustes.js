function editarCampo(id) {
    let campo = document.getElementById(id);
    campo.removeAttribute('readonly');
    campo.focus();
}

async function guardarCambios() {
    let mote = document.getElementById('mote').value;
    let descripcion = document.getElementById('descripcion').value;

    // Desactivar la edición
    document.getElementById('mote').setAttribute('readonly', true);
    document.getElementById('descripcion').setAttribute('readonly', true);

    // Enviar los cambios al servidor
    const token = localStorage.getItem('token'); // Obtener el token del localStorage
    const response = await fetch('/actualizarPerfil', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mote, descripcion })
    });

    const data = await response.json();

    if (data.message === 'Perfil actualizado correctamente') {
        window.location.replace("perfil.html");
        alert('Cambios guardados correctamente');
    } else {
        alert('Hubo un error al guardar los cambios');
    }
}