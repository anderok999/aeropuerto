const mysql = require('mysql2');
require('dotenv').config();


const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Cambia esto por tu usuario de MySQL
    password: '',     // Cambia esto por tu contraseña
    database: 'proyecto_aero',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();