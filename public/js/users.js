// Variables para controlar los límites
const MOTE_MAX_LENGTH = 15;
const DESCRIPCION_MAX_LENGTH = 100;

// Agregar escuchadores para validación en tiempo real
document.addEventListener('DOMContentLoaded', function() {
    // Configurar contador de caracteres para descripción
    const descripcion = document.getElementById('descripcion');
    const mote = document.getElementById('mote');
    
    // Crear elementos para mostrar contadores
    const descripcionCounter = document.createElement('div');
    descripcionCounter.className = 'character-counter';
    descripcion.parentNode.appendChild(descripcionCounter);
    
    const moteCounter = document.createElement('div');
    moteCounter.className = 'character-counter';
    mote.parentNode.appendChild(moteCounter);
    
    // Actualizar contadores iniciales
    actualizarContador(descripcion, descripcionCounter, DESCRIPCION_MAX_LENGTH);
    actualizarContador(mote, moteCounter, MOTE_MAX_LENGTH);
    
    // Agregar eventos para actualizar contadores mientras se escribe
    descripcion.addEventListener('input', function() {
        actualizarContador(descripcion, descripcionCounter, DESCRIPCION_MAX_LENGTH);
    });
    
    mote.addEventListener('input', function() {
        actualizarContador(mote, moteCounter, MOTE_MAX_LENGTH);
    });
});

// Función para actualizar el contador de caracteres
function actualizarContador(campo, contador, maxLength) {
    const remaining = maxLength - campo.value.length;
    contador.textContent = `${campo.value.length}/${maxLength}`;
    
    // Cambiar estilo según proximidad al límite
    if (remaining < 10) {
        contador.style.color = 'orange';
    }
    
    if (remaining < 5) {
        contador.style.color = 'red';
    }
    
    if (remaining >= 10) {
        contador.style.color = 'green';
    }
    
    // Limitar entrada si excede el máximo
    if (campo.value.length > maxLength) {
        campo.value = campo.value.substring(0, maxLength);
        contador.textContent = `${maxLength}/${maxLength}`;
    }
}

// Modificar la función editarCampo para incluir validación
function editarCampo(id) {
    let campo = document.getElementById(id);
    campo.removeAttribute('readonly');
    campo.focus();
}

// Modificar la función guardarCambios para incluir validación
async function guardarCambios() {
    let mote = document.getElementById('mote').value;
    let descripcion = document.getElementById('descripcion').value;
    
    // Validar antes de enviar
    if (mote.length > MOTE_MAX_LENGTH) {
        alert(`El apodo debe tener máximo ${MOTE_MAX_LENGTH} caracteres.`);
        return;
    }
    
    if (descripcion.length > DESCRIPCION_MAX_LENGTH) {
        alert(`La descripción debe tener máximo ${DESCRIPCION_MAX_LENGTH} caracteres.`);
        return;
    }

    // Desactivar la edición
    document.getElementById('mote').setAttribute('readonly', true);
    document.getElementById('descripcion').setAttribute('readonly', true);

    try {
        // Enviar los cambios al servidor
        const token = localStorage.getItem('token');
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
            alert('Cambios guardados correctamente');
        } else {
            alert('Hubo un error al guardar los cambios: ' + data.message);
        }
    } catch (error) {
        alert('Error de conexión: ' + error.message);
    }
}
