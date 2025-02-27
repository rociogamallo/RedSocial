const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Ruta de registro
router.post('/registro', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await admin.auth().createUser({
            email: email,
            password: password
        });
        res.status(201).json({ message: 'Usuario registrado con éxito', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
