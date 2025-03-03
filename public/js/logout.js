document.addEventListener("DOMContentLoaded", function () {
    const logoutLink = document.getElementById("logout");

    if (logoutLink) {
        logoutLink.addEventListener("click", function (event) {
            event.preventDefault(); // Evita que el enlace navegue automáticamente

            // Eliminar el token del localStorage
            localStorage.removeItem("token");
            localStorage.removeItem("email");

            // Redirigir a la página de login
            window.location.href = "./login.html";
        });
    }
});

