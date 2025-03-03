require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');  // Requiere multer para subir archivos
const app = express();
const webpush = require('web-push');

// Configurar Web Push
const vapidKeys = {
  publicKey: 'BK3dQwXI_qONBKYUHkooFbPXmQeewtjN0QhK1kBpVFBuM0wid5uD34Ttspm1Fo3RjO1GJTKHEV_LNFjGAbuHIRk',
  privateKey: 'AdzbzW2r8xEYuN5OQxRfpx6-mnCsD8LjIG5Ry2SuwUY'
};

webpush.setVapidDetails(
  'mailto:tu@email.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

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

app.get("/bibliotecas", async (req, res) => {
  try {
      const response = await fetch("https://datos.madrid.es/egob/catalogo/201747-0-bibliobuses-bibliotecas.xml");
      const data = await response.text();
      res.set("Content-Type", "application/xml");
      res.send(data);
  } catch (error) {
      res.status(500).send("Error al obtener los datos");
  }
});

app.listen(3001, () => console.log("Servidor proxy en http://localhost:3001"));


// Ruta para servir el archivo HTML principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Iniciar el servidor HTTP
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


// Middleware para verificar el token de autenticación
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Se requiere autenticación' });
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error al verificar el token:', error);
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// Endpoint para obtener los chats del usuario
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    // Obtener todos los chats donde el usuario es participante
    const chatsSnapshot = await admin.firestore().collection('chats')
      .where('participantes', 'array-contains', userEmail)
      .orderBy('lastMessageTime', 'desc')
      .get();
    
    const chats = [];
    
    for (const doc of chatsSnapshot.docs) {
      const chatData = doc.data();
      
      // Obtener el otro participante
      const otherUserEmail = chatData.participantes.find(email => email !== userEmail);
      
      // Obtener información del otro usuario
      const usersSnapshot = await admin.firestore().collection('users')
        .where('email', '==', otherUserEmail)
        .get();
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        
        // Formatear la hora del último mensaje
        let formattedTime = '';
        if (chatData.lastMessageTime) {
          const lastMessageDate = chatData.lastMessageTime.toDate();
          formattedTime = formatMessageTime(lastMessageDate);
        }
        
        // Obtener el recuento de mensajes no leídos
        const unreadCount = chatData.unreadCount && chatData.unreadCount[userEmail] 
          ? chatData.unreadCount[userEmail] 
          : 0;
        
        // Obtener nombre para mostrar
        const displayName = userData.nombre && userData.apellidos 
          ? `${userData.nombre} ${userData.apellidos}` 
          : otherUserEmail;
        
        chats.push({
          id: doc.id,
          lastMessage: chatData.lastMessage || '',
          lastMessageTime: formattedTime,
          unreadCount: unreadCount,
          otherUserEmail: otherUserEmail,
          otherUserName: displayName,
          otherUserPhoto: userData.foto || '',
          otherUserOnline: userData.online || false
        });
      }
    }
    
    res.json(chats);
    
  } catch (error) {
    console.error('Error al obtener los chats:', error);
    res.status(500).json({ error: 'Error al obtener los chats' });
  }
});

// Endpoint para obtener sugerencias de usuarios
app.get('/api/users/suggested', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    // Obtener todos los usuarios excepto el actual
    const usersSnapshot = await admin.firestore().collection('users')
      .limit(20)
      .get();
    
    // Obtener los chats existentes para filtrar usuarios
    const chatsSnapshot = await admin.firestore().collection('chats')
      .where('participantes', 'array-contains', userEmail)
      .get();
    
    const existingChatEmails = new Set();
    chatsSnapshot.forEach(doc => {
      const participantes = doc.data().participantes;
      participantes.forEach(email => {
        if (email !== userEmail) {
          existingChatEmails.add(email);
        }
      });
    });
    
    // Filtrar usuarios
    const suggestedUsers = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.email !== userEmail && !existingChatEmails.has(userData.email)) {
        suggestedUsers.push({
          id: doc.id,
          email: userData.email,
          nombre: userData.nombre || '',
          apellidos: userData.apellidos || '',
          foto: userData.foto || '',
          localidad: userData.localidad || '',
          online: userData.online || false
        });
      }
    });
    
    res.json(suggestedUsers);
    
  } catch (error) {
    console.error('Error al obtener sugerencias de usuarios:', error);
    res.status(500).json({ error: 'Error al obtener sugerencias de usuarios' });
  }
});

// Endpoint para crear un nuevo chat
app.post('/api/chats/create', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { otherUserEmail } = req.body;
    
    if (!otherUserEmail) {
      return res.status(400).json({ error: 'Se requiere el email del otro usuario' });
    }
    
    // Comprobar si ya existe un chat entre estos usuarios
    const existingChatsQuery = await admin.firestore().collection('chats')
      .where('participantes', 'array-contains', userEmail)
      .get();
    
    let existingChatId = null;
    
    existingChatsQuery.forEach(doc => {
      const chatData = doc.data();
      if (chatData.participantes.includes(otherUserEmail)) {
        existingChatId = doc.id;
      }
    });
    
    // Si ya existe un chat, devolver su ID
    if (existingChatId) {
      return res.json({ chatId: existingChatId });
    }
    
    // Si no existe, crear nuevo chat
    const newChat = {
      participantes: [userEmail, otherUserEmail],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: "",
      unreadCount: {
        [userEmail]: 0,
        [otherUserEmail]: 0
      }
    };
    
    const chatRef = await admin.firestore().collection('chats').add(newChat);
    
    res.status(201).json({ chatId: chatRef.id });
    
  } catch (error) {
    console.error('Error al crear chat:', error);
    res.status(500).json({ error: 'Error al crear chat' });
  }
});

// Función auxiliar para formatear la hora del mensaje
function formatMessageTime(timestamp) {
  const now = new Date();
  const messageDate = new Date(timestamp);
  
  // Si es hoy, mostrar solo la hora
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  // Si es ayer
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  }
  
  // Si es esta semana, mostrar el día
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const daysDiff = (now - messageDate) / (1000 * 60 * 60 * 24);
  if (daysDiff < 7) {
    return daysOfWeek[messageDate.getDay()];
  }
  
  // Si es otro día, mostrar fecha corta
  return messageDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

// Endpoint para guardar suscripción de notificaciones push
app.post('/api/subscribe', authenticateToken, async (req, res) => {
  try {
    const subscription = req.body;
    const userEmail = req.user.email;
    
    // Guardar la suscripción en Firestore
    await db.collection('users').where('email', '==', userEmail).get()
      .then(snapshot => {
        if (!snapshot.empty) {
          snapshot.docs[0].ref.update({
            pushSubscription: subscription
          });
        }
      });
    
    res.status(201).json({ message: 'Suscripción guardada' });
  } catch (error) {
    console.error('Error al guardar suscripción:', error);
    res.status(500).json({ error: 'Error al guardar suscripción' });
  }
});

// Actualiza la función sendPushNotification para que maneje mejor los errores
async function sendPushNotification(userEmail, title, body, icon, url) {
  try {
      // Obtener la suscripción del usuario
      const userSnapshot = await db.collection('users')
          .where('email', '==', userEmail)
          .get();
      
      if (userSnapshot.empty) {
          console.log(`No se encontró el usuario ${userEmail} para enviar notificación`);
          return;
      }
      
      const userData = userSnapshot.docs[0].data();
      if (!userData.pushSubscription) {
          console.log(`El usuario ${userEmail} no tiene suscripción push`);
          return;
      }
      
      const subscription = userData.pushSubscription;
      
      // Enviar notificación
      console.log(`Enviando notificación push a ${userEmail}: ${title}`);
      
      await webpush.sendNotification(subscription, JSON.stringify({
          title,
          body,
          icon,
          url
      }));
      
      console.log(`Notificación enviada con éxito a ${userEmail}`);
  } catch (error) {
      console.error(`Error al enviar notificación push a ${userEmail}:`, error);
      
      // Si el error es de suscripción expirada, eliminarla
      if (error.statusCode === 410) {
          console.log(`Suscripción expirada para ${userEmail}, eliminando...`);
          try {
              await db.collection('users')
                  .where('email', '==', userEmail)
                  .get()
                  .then(snapshot => {
                      if (!snapshot.empty) {
                          snapshot.docs[0].ref.update({
                              pushSubscription: admin.firestore.FieldValue.delete()
                          });
                      }
                  });
          } catch (deleteError) {
              console.error('Error al eliminar suscripción expirada:', deleteError);
          }
      }
  }
}

// Añade un endpoint para obtener la clave pública VAPID
app.get('/api/vapidPublicKey', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Añade un trigger para Firestore que envíe notificaciones cuando se creen nuevos mensajes
// Esto debe implementarse como una Cloud Function, pero aquí te muestro cómo sería:
db.collection('chats').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(async change => {
      if (change.type === 'modified') {
          const chatData = change.doc.data();
          const chatId = change.doc.id;
          
          // Verificar si hay un contador de no leídos
          if (chatData.unreadCount) {
              // Para cada usuario con mensajes no leídos
              for (const [userEmail, count] of Object.entries(chatData.unreadCount)) {
                  // Si hay mensajes no leídos
                  if (count > 0) {
                      try {
                          // Obtener información del otro usuario (el remitente)
                          const otherUserEmail = chatData.participantes.find(email => email !== userEmail);
                          
                          if (otherUserEmail) {
                              const userSnapshot = await db.collection('users')
                                  .where('email', '==', otherUserEmail)
                                  .get();
                              
                              if (!userSnapshot.empty) {
                                  const userData = userSnapshot.docs[0].data();
                                  const userName = userData.nombre && userData.apellidos ? 
                                      `${userData.nombre} ${userData.apellidos}` : otherUserEmail;
                                  const userPhoto = userData.foto || '/img/default.png';
                                  
                                  // Enviar notificación push
                                  await sendPushNotification(
                                      userEmail,
                                      `Nuevo mensaje de ${userName}`,
                                      chatData.lastMessage || 'Tienes un nuevo mensaje',
                                      userPhoto,
                                      `/messages.html?chatId=${chatId}&otherEmail=${otherUserEmail}`
                                  );
                              }
                          }
                      } catch (error) {
                          console.error('Error al enviar notificación:', error);
                      }
                  }
              }
          }
      }
  });
});

// Añade este endpoint a server.js
app.get('/api/notifications/status', authenticateToken, async (req, res) => {
  try {
      const userEmail = req.user.email;
      
      // Obtener el usuario
      const userSnapshot = await db.collection('users')
          .where('email', '==', userEmail)
          .get();
      
      if (userSnapshot.empty) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const userData = userSnapshot.docs[0].data();
      
      // Verificar si tiene suscripción push
      const hasPushSubscription = !!userData.pushSubscription;
      
      res.json({
          notificationsEnabled: hasPushSubscription,
          browserSupport: true
      });
      
  } catch (error) {
      console.error('Error al verificar estado de notificaciones:', error);
      res.status(500).json({ error: 'Error al verificar estado de notificaciones' });
  }
});
