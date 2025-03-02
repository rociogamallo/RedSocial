// public/js/users.js
document.addEventListener("DOMContentLoaded", () => {
    const apodoInput = document.querySelector("[name='nombre']");
    const descripcionInput = document.querySelector("[name='descripcion']");
    const saveButton = document.querySelector(".save-btn");

    // Validación de apodo
    apodoInput.addEventListener("input", () => {
        if (apodoInput.textContent.length > 15) {
            alert("El apodo no puede tener más de 15 caracteres.");
            apodoInput.textContent = apodoInput.textContent.substring(0, 15);
        }
    });

    // Validación de descripción con alerta de límite
    descripcionInput.addEventListener("input", () => {
        const maxLength = 100;
        if (descripcionInput.textContent.length >= maxLength) {
            alert("Has alcanzado el límite de 100 caracteres en la descripción.");
        }
    });

    saveButton.addEventListener("click", (event) => {
        if (apodoInput.textContent.length === 0) {
            alert("El apodo es obligatorio.");
            event.preventDefault();
        }
    });
});
