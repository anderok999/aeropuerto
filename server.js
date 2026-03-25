const express = require('express');
const cors = require('cors');
const mysql = require('mysql2'); // Asegúrate de haber instalado: npm install mysql2
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE BASE DE DATOS ---
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'sql10.freesqldatabase.com',
    user: process.env.DB_USER || 'sql10821177',
    password: process.env.DB_PASSWORD || 'qMNkINbfea',
    database: process.env.DB_NAME || 'sql10821177',
    port: 3306
});

// Probar conexión a la base de datos
db.connect((err) => {
    if (err) {
        console.error('❌ Error de conexión a la DB remota:', err.message);
        return;
    }
    console.log('✅ Conectado exitosamente a FreeSQLDatabase');
});

// Middlewares
app.use(cors());
app.use(express.json());

// Importación de Rutas
const tecnicosRoutes = require('./routes/tecnicos');
const operacionesRoutes = require('./routes/operaciones');

// Uso de Rutas
app.use('/api/tecnicos', tecnicosRoutes);
app.use('/api/operaciones', operacionesRoutes);

// Ruta de prueba de salud (Health Check)
app.get('/', (req, res) => {
    res.send('✈️ Servidor BoA Operativo');
});

// Puerto de escucha
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✈️  Sistema BoA v1.0 corriendo en puerto ${PORT}`);
    console.log(`📅 Fecha del sistema: ${new Date().toLocaleDateString()}`);
    console.log(`🌐 Host: ${process.env.DB_HOST || 'sql10.freesqldatabase.com'}`);
});