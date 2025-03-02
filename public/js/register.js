document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("registerForm");
    const progressBar = document.getElementById("progressBar");
    const submitButton = document.getElementById("submitButton");

    function validateForm() {
        let valid = true;
        let progress = 0;

        const nombre = document.getElementById("nombre").value.trim();
        const apellidos = document.getElementById("apellidos").value.trim();
        const genero = document.getElementById("genero").value;
        const localidad = document.getElementById("localidad").value.trim();
        const fechaNacimiento = document.getElementById("fechaNacimiento").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (nombre.length === 0 || nombre.length > 30) valid = false;
        else progress += 15;

        if (apellidos.length === 0 || apellidos.length > 50) valid = false;
        else progress += 15;

        if (!["hombre", "mujer"].includes(genero)) valid = false;
        else progress += 15;

        if (localidad.length === 0) valid = false;
        else progress += 15;

        if (!isValidAge(fechaNacimiento)) valid = false;
        else progress += 20;

        if (password !== confirmPassword || password.length < 6) valid = false;
        else progress += 20;

        updateProgressBar(progress, valid);
    }

    function isValidAge(date) {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 >= 18;
        }
        return age >= 18;
    }

    function updateProgressBar(progress, valid) {
        progressBar.style.width = progress + "%";
        progressBar.setAttribute("aria-valuenow", progress);
        progressBar.classList.remove("bg-success", "bg-danger");
        progressBar.classList.add(valid ? "bg-success" : "bg-danger");
        submitButton.disabled = !valid;
    }

    form.addEventListener("input", validateForm);
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        alert("¡Formulario enviado correctamente!");
    });
});

document.getElementById("registerForm").addEventListener("input", function () {
    const fields = Array.from(document.querySelectorAll("#registerForm input, #registerForm select"));
    const filledFields = fields.filter(field => field.value.trim() !== "");
    const progress = (filledFields.length / fields.length) * 100;
    const progressBar = document.getElementById("progressBar");
    progressBar.style.width = progress + "%";
    progressBar.setAttribute("aria-valuenow", progress);

    // Solo se pone verde cuando todo está completo
    if (progress === 100) {
        progressBar.classList.add("bg-success");
        checkPasswords();
    } else {
        progressBar.classList.remove("bg-success");
        document.getElementById("submitButton").disabled = true;
    }
});

// Verificar si las contraseñas coinciden
function checkPasswords() {
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    document.getElementById("submitButton").disabled = password !== confirmPassword;
}

// Manejar el evento de submit
document.getElementById("registerForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const apellidos = document.getElementById("apellidos").value;
    const genero = document.getElementById("genero").value;
    const email = document.getElementById("email").value;
    const localidad = document.getElementById("localidad").value;
    const fechaNacimiento = document.getElementById("fechaNacimiento").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Verificar si las contraseñas coinciden antes de enviar
    if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    // Validación de correo electrónico
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    if (!emailRegex.test(email)) {
        alert("Por favor, ingrese un correo electrónico válido.");
        return;
    }

    // Enviar los datos del formulario al servidor
    fetch("http://localhost:3000/registrar", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nombre,
            apellidos,
            genero,
            email,
            localidad,
            fechaNacimiento,
            password,
            descripcion: '',  
            mote: '',      
            foto: 'default.png'  
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("¡Registro exitoso!");
            window.location.href = "login.html";
        } else {
            alert("Hubo un problema con el registro.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Hubo un error en la solicitud. Por favor, intente de nuevo.");
    });
});
