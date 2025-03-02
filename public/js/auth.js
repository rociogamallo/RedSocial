import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBgf6uDmurevI9MSV-gGgR_EmNFWHILsWs",
    authDomain: "libros-9d5d4.firebaseapp.com",
    projectId: "libros-9d5d4",
    storageBucket: "libros-9d5d4.appspot.com",
    messagingSenderId: "802623661541",
    appId: "1:802623661541:web:5bce5122460c335c4ebb0c"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Manejar el formulario de login
document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Por favor, complete todos los campos.');
        return;
    }

    try {
        // Iniciar sesión con Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        const userEmail = userCredential.user.email; // Obtener el email del usuario logueado

        // Guardar el token y el email en localStorage
        localStorage.setItem('token', idToken);
        localStorage.setItem('email', userEmail); // Guardar el email del usuario

        alert('Inicio de sesión exitoso');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al iniciar sesión con Firebase:', error);
        alert('Error al iniciar sesión: ' + error.message);

        // Manejo de errores específicos
        switch (error.code) {
            case 'auth/invalid-email':
                alert('Correo electrónico no válido');
                break;
            case 'auth/wrong-password':
                alert('Contraseña incorrecta');
                break;
            case 'auth/user-not-found':
                alert('Usuario no encontrado');
                break;
            default:
                alert('Error desconocido: ' + error.message);
        }
    }
});