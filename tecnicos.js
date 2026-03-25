const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/disponibilidad', async (req, res) => {
    try {
        const sql = `
            SELECT t.id_tecnico, t.nombre, t.apellido, e.nombre_especialidad, 
                   l.fecha_vencimiento, t.nivel_experiencia,
                   CASE 
                       WHEN l.fecha_vencimiento < CURDATE() THEN 'BLOQUEADO'
                       WHEN l.fecha_vencimiento IS NULL THEN 'SIN LICENCIA'
                       ELSE 'APTO'
                   END AS estatus_legal
            FROM tecnicos t
            JOIN especialidades e ON t.id_especialidad = e.id_especialidad
            LEFT JOIN licencias l ON t.id_tecnico = l.id_tecnico
            WHERE t.estado = 'Activo'
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Error en el servidor de base de datos" });
    }
});

module.exports = router;