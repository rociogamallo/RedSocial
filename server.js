require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');
const app = express();

// Inicializar Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();

// Middleware para habilitar CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


// Middleware para parsear JSON (nativo de Express)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (como HTML, CSS y JS)
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para registrar usuario
app.post('/registrar', async (req, res) => {
    const { nombre, apellidos, genero, email, localidad, fechaNacimiento, password } = req.body;

    console.log('Datos recibidos:', req.body);

    // Validación simple
    if (!nombre || !apellidos || !genero || !email || !localidad || !fechaNacimiento || !password) {
        return res.status(400).json({ success: false, message: "Todos los campos son requeridos." });
    }

    try {
        // Crear el usuario en Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: `${nombre} ${apellidos}`,
            disabled: false
        });

        console.log('Usuario creado:', userRecord);

        // Guardar información adicional en Firestore
        await db.collection('users').doc(userRecord.uid).set({
            nombre,
            apellidos,
            genero,
            email,
            localidad,
            fechaNacimiento,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ success: true, message: "¡Registro exitoso!" });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
    
        res.status(500).json({
            success: false,
            message: "Hubo un error al registrar el usuario.",
            code: error.code || 'unknown_error',
            details: error.message
        });
    }
});

// Endpoint para login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    try {
        // Iniciar sesión con Firebase Auth usando el SDK de Cliente
        const userCredential = await admin.auth().getUserByEmail(email);
        
        // En este caso, el back-end ya está verificando el login, no es necesario el SDK de cliente
        if (userCredential) {
            res.status(200).json({ message: 'Inicio de sesión exitoso' });
        } else {
            res.status(401).json({ message: 'Credenciales inválidas' });
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error.message);
        res.status(401).json({ message: 'Credenciales inválidas', error: error.message });
    }
});

// Endpoint para obtener datos del perfil
app.get('/perfil', async (req, res) => {
    const token = req.headers.authorization;

    // Verificar si el token existe
    if (!token) {
        return res.status(401).json({ message: 'No se proporcionó un token' });
    }

    try {
        // Verificar el token de ID con Firebase Admin
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;

        // Obtener datos del usuario desde Firestore
        const userDoc = await db.collection('users').doc(uid).get();

        // Verificar si el documento existe
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Perfil no encontrado' });
        }

        // Obtener datos del usuario
        const userData = userDoc.data();

        // Verificar y asignar valores predeterminados si faltan datos
        res.status(200).json({
            nombre: userData.nombre || 'Sin nombre',
            apellidos: userData.apellidos || '',
            descripcion: userData.descripcion || 'Sin descripción',
            localidad: userData.localidad || 'No especificada',
            foto: userData.foto || 'default.png' // Imagen por defecto si no hay foto
        });
    } catch (error) {
        console.error('Error al obtener el perfil:', error.message);

        // Verificar si el error es de autenticación
        if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
            return res.status(401).json({ message: 'Token inválido o expirado' });
        }

        res.status(500).json({ message: 'Error al obtener el perfil' });
    }
});


// Ruta para servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

