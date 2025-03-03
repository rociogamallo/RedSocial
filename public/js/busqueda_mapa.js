document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");

    if (!token) {
        // Si no hay token, redirigir a login
        window.location.replace("login.html");
    }
    await cargarBibliotecas();
    obtenerUbicacionUsuario(); // Llamar aquí la función
    // Asignar evento al botón de búsqueda
    document.getElementById("search-button").addEventListener("click", buscarBiblioteca);
});

// Inicializar el mapa con Leaflet
const map = L.map("map").setView([40.4168, -3.7038], 12); // Madrid

// Agregar capa base (mapa de OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Definir iconos personalizados
var homeIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

var bookIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});


// Obtener la ubicación del usuario y mostrar en el mapa
function obtenerUbicacionUsuario() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Centrar el mapa en la ubicación del usuario
                map.setView([userLat, userLng], 15);
                
                // Agregar marcador con icono de casa
                L.marker([userLat, userLng], { icon: homeIcon }).addTo(map)
                    .bindPopup("<b>Tu ubicación actual</b>")
                    .openPopup();
            },
            function (error) {
                console.log("Error al obtener la ubicación: ", error.message);
            }
        );
    } else {
        console.log("Geolocalización no soportada en este navegador");
    }
}

// Guardar las bibliotecas cargadas
let bibliotecasData = [];

async function cargarBibliotecas() {
    try {
        const response = await fetch("http://localhost:3001/bibliotecas");
        if (!response.ok) throw new Error("Error al obtener el archivo XML");

        const data = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(data, "application/xml");

        mostrarBibliotecasEnMapa(xml);
    } catch (error) {
        console.error("Error al cargar el archivo XML: ", error);
    }
}

function mostrarBibliotecasEnMapa(xml) {
    const bibliotecas = xml.getElementsByTagName("contenido");

    for (let i = 0; i < bibliotecas.length; i++) {
        const nombre = bibliotecas[i].querySelector("atributo[nombre='NOMBRE']")?.textContent || "Desconocido";
        const latitud = bibliotecas[i].querySelector("atributo[nombre='LATITUD']")?.textContent;
        const longitud = bibliotecas[i].querySelector("atributo[nombre='LONGITUD']")?.textContent;

        if (!latitud || !longitud) continue;

        const lat = parseFloat(latitud);
        const lon = parseFloat(longitud);

        // Agregar marcador con icono de biblioteca
        const marcador = L.marker([lat, lon], { icon: bookIcon }).addTo(map)
        .bindPopup(`<strong>${nombre}</strong>`);

        // Guardar en el array para búsqueda posterior
        bibliotecasData.push({ nombre, lat, lon, marcador });
    }
}

// Buscar biblioteca por nombre
function buscarBiblioteca() {
    const searchInput = document.getElementById("search").value.toLowerCase().trim();

    if (!searchInput) {
        alert("Por favor, introduce un nombre de biblioteca.");
        return;
    }

    // Buscar biblioteca por nombre
    const bibliotecaEncontrada = bibliotecasData.find(b => b.nombre.toLowerCase().includes(searchInput));

    if (bibliotecaEncontrada) {
        // Centrar mapa en la biblioteca encontrada y abrir popup
        map.setView([bibliotecaEncontrada.lat, bibliotecaEncontrada.lon], 16);
        bibliotecaEncontrada.marcador.openPopup();
    } else {
        alert("No se encontró ninguna biblioteca con ese nombre.");
    }
}

//Obtiene la ubicación del usuario
navigator.geolocation.getCurrentPosition(
    function (position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        map.setView([userLat, userLng], 15);
        L.marker([userLat, userLng], { icon: homeIcon }).addTo(map)
            .bindPopup("<b>Tu ubicación actual</b>")
            .openPopup();
    },
    function (error) {
        console.error("Error al obtener la ubicación: ", error.message);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
);

