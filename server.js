require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');  // Requiere multer para subir archivos
const app = express();

// Inicializar Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();

// Configuración de multer para almacenar las imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  // La carpeta donde se guardarán las imágenes
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Middleware para habilitar CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (como HTML, CSS y JS)
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('uploads'));  // Servir las imágenes subidas desde la carpeta "uploads"

// Endpoint para registrar usuario
app.post('/registrar', async (req, res) => {
  const { nombre, apellidos, genero, email, localidad, fechaNacimiento, password } = req.body;

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

    // Guardar información adicional en Firestore
    await db.collection('users').doc(userRecord.uid).set({
      nombre,
      apellidos,
      genero,
      email,
      localidad,
      fechaNacimiento,
      foto: '/img/default.png',  // Imagen predeterminada
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
    // Obtener el usuario por correo
    const userRecord = await admin.auth().getUserByEmail(email);

    if (userRecord) {
      // Generar un token personalizado con el UID del usuario
      const customToken = await admin.auth().createCustomToken(userRecord.uid);

      // Enviar el token al frontend
      res.status(200).json({ 
        message: 'Inicio de sesión exitoso',
        token: customToken
      });
    } else {
      res.status(401).json({ message: 'Credenciales inválidas' });
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    res.status(401).json({ message: 'Credenciales inválidas', error: error.message });
  }
});

app.get('/perfil', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No se proporcionó un token' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Obtener datos del usuario desde Firestore
    const userDoc = await admin.firestore().collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }

    const userData = userDoc.data();

    // Obtener los libros del usuario
    const booksSnapshot = await db.collection('libros').where('email', '==', userData.email).get();
    const books = booksSnapshot.docs.map(doc => doc.data());

    res.status(200).json({
      nombre: userData.nombre || 'Sin nombre',
      apellidos: userData.apellidos || '',
      descripcion: userData.descripcion || 'Sin descripción',
      localidad: userData.localidad || 'No especificada',
      foto: userData.foto || 'default.png',
      mote: userData.mote,
      libros: books
    });
  } catch (error) {
    console.error('Error al obtener el perfil:', error.message);
    res.status(500).json({ message: 'Error al obtener el perfil' });
  }
});


// Endpoint para agregar un libro
app.post('/agregarLibro', upload.single('imagen'), async (req, res) => {
  const { tituloLibro, autor, genero, estado, resumen, email } = req.body;
  const imagen = req.file;

  if (!tituloLibro || !autor || !genero || !estado || !resumen || !email) {
    return res.status(400).json({ message: 'Todos los campos son requeridos, incluido el email' });
  }

  try {
    // Si no se sube imagen, usar la imagen predeterminada
    const imageUrl = imagen ? `/img/${imagen.filename}` : '/img/libro.png';

    // Guardar el libro en Firestore con el email
    const newBook = {
      titulo: tituloLibro,
      autor,
      genero,
      estado,
      resumen,
      imagen: imageUrl,
      email: email,  // Guardar el email del usuario
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('libros').add(newBook);

    res.status(201).json({ success: true, message: 'Libro añadido exitosamente', imageUrl });
  } catch (error) {
    console.error('Error al agregar el libro:', error.message);
    res.status(500).json({ message: 'Error al agregar el libro' });
  }
});

app.delete('/borrarLibro/:titulo', async (req, res) => {
  const { titulo } = req.params;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No se proporcionó un token' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Aquí puedes usar el título que se pasa por la URL
    const bookRef = db.collection('libros').where('titulo', '==', titulo);
    const snapshot = await bookRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    // Borrar el libro
    snapshot.docs.forEach(doc => doc.ref.delete());

    res.status(200).json({ message: 'Libro eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el libro:', error);
    res.status(500).json({ message: 'Error al eliminar el libro' });
  }
});

// Endpoint para actualizar el mote y la descripción
app.put('/actualizarPerfil', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No se proporcionó un token' });
  }

  const { mote, descripcion } = req.body;

  try {
    // Verificar el token y obtener el UID del usuario
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Actualizar el mote y la descripción en Firestore
    await db.collection('users').doc(uid).update({
      mote,
      descripcion,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error al actualizar el perfil' });
  }
});

// Ruta para obtener los libros
app.get("/libros", async (req, res) => {
  try {
      const librosSnapshot = await db.collection("libros").get();
      const libros = librosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      }));

      res.json(libros);
  } catch (error) {
      res.status(500).json({ error: "Error obteniendo libros" });
  }
});

// Endpoint para buscar libros
app.get('/buscar', async (req, res) => {
  const searchTerm = req.query.q?.toLowerCase() || '';
  try {
    const librosSnapshot = await db.collection('libros').get();
    const libros = librosSnapshot.docs.map(doc => doc.data());

    // Filtrar los libros por título, autor o género
    const filteredBooks = libros.filter(book => {
      return (
        book.titulo.toLowerCase().includes(searchTerm) ||
        book.autor.toLowerCase().includes(searchTerm) ||
        book.genero.toLowerCase().includes(searchTerm)
      );
    });

    res.json(filteredBooks);
  } catch (error) {
    console.error("Error en la búsqueda de libros:", error);
    res.status(500).json({ error: "Error al realizar la búsqueda" });
  }
});


// Ruta para servir el archivo HTML principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Iniciar el servidor HTTP
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
