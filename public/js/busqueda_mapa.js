document.addEventListener("DOMContentLoaded", function() {
    var map = L.map('map').setView([40.4227389, -3.7130504], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map)
    var homeIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    })
    var bookIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    })
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                var userLat = position.coords.latitude;
                var userLng = position.coords.longitude
                map.setView([userLat, userLng], 15);
                L.marker([userLat, userLng], { icon: homeIcon }).addTo(map)
                    .bindPopup("<b>Tu ubicación actual</b>")
                    .openPopup()
                var libraries = [
                    { name: "Biblioteca Nacional de España", lat: 40.423716, lng: -3.689207 },
                    { name: "Biblioteca Iván de Vargas", lat: 40.412110, lng: -3.714134 },
                    { name: "Biblioteca Pedro Salinas", lat: 40.404126, lng: -3.713053 },
                    { name: "Biblioteca Mario Vargas Llosa", lat: 40.430769, lng: -3.703541 },
                    { name: "Biblioteca Pública José Hierro", lat: 40.345927, lng: -3.730108 },
                    { name: "Biblioteca Pública Municipal Eugenio Trías", lat: 40.415365, lng: -3.676939 },
                    { name: "Biblioteca Pública Municipal Ángel González", lat: 40.392662, lng: -3.751463 }
                ]
                libraries.forEach(function(lib) {
                    L.marker([lib.lat, lib.lng], { icon: bookIcon }).addTo(map)
                        .bindPopup("<b>" + lib.name + "</b>");
                });
            },
            function(error) {
                console.log("Error al obtener la ubicación: ", error.message);
            }
        );
    } else {
        console.log("Geolocalización no soportada en este navegador");
    }
})
