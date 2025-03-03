// Obtener el formulario y el campo de la imagen
const form = document.getElementById('formAgregarLibro');
form.addEventListener('submit', function (e) {
  e.preventDefault();  // Evitar envío del formulario de forma tradicional

  // Crear un objeto FormData para enviar los datos
  const formData = new FormData(form);

  // Comprobar si se seleccionó una imagen
  if (!formData.get('imagen')) {
    // Si no se seleccionó imagen, asignamos la imagen predeterminada
    formData.append('imagen', '/img/libro.png');
  }

  // Obtener el email desde localStorage
  const email = localStorage.getItem('email');
  if (email) {
    formData.append('email', email); // Añadir el email al FormData
  } else {
    alert('No se ha encontrado el email. Por favor, inicie sesión.');
    return;
  }

  // Enviar los datos del formulario al servidor (endpoint de agregar libro)
  fetch('/agregarLibro', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Libro agregado exitosamente');
        window.location.replace("perfil.html");
        form.reset();  // Limpiar el formulario
      } else {
        alert('Error al agregar el libro');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Hubo un error al enviar el formulario');
    });

    
});
