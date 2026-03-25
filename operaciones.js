const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/flota-critica', async (req, res) => {
    try {
        const sql = `
            SELECT a.id_aeronave, a.matricula, a.modelo, a.estado, ot.id_ot, ot.descripcion_tarea
            FROM aeronaves a
            JOIN ordenes_trabajo ot ON a.id_aeronave = ot.id_aeronave
            WHERE a.estado IN ('Mantenimiento', 'AOG') AND ot.id_ot NOT IN (SELECT id_ot FROM asignacion_tareas WHERE estado_tarea = 'Completada')
            ORDER BY a.estado DESC
        `;
        const [aeronaves] = await db.query(sql);
        res.json(aeronaves);
    } catch (err) {
        res.status(500).json({ error: "Error al consultar la flota y OTs" });
    }
});

router.post('/asignar-tarea', async (req, res) => {
    const { id_tecnico, id_ot, id_turno } = req.body;

    try {
       
        const [licencia] = await db.query(
            "SELECT fecha_vencimiento FROM licencias WHERE id_tecnico = ? AND fecha_vencimiento >= CURDATE()",
            [id_tecnico]
        );

        if (licencia.length === 0) {
            return res.status(403).json({ error: "ASIGNACIÓN RECHAZADA: Licencia vencida o no registrada." });
        }

    
        const sql = `INSERT INTO asignacion_tareas (id_ot, id_tecnico, id_turno, fecha_ejecucion, estado_tarea) 
                     VALUES (?, ?, ?, CURDATE(), 'En Proceso')`;
        
        await db.query(sql, [id_ot, id_tecnico, id_turno]);
        
        res.json({ mensaje: "Asignación exitosa. Técnico desplegado al hangar." });

    } catch (err) {
        res.status(500).json({ error: "Error interno al procesar la asignación." });
    }
});

router.get('/asignaciones-activas', async (req, res) => {
    try {
        const sql = `
            SELECT 
                a.id_asignacion_tarea, 
                t.nombre, 
                t.apellido, 
                an.matricula, 
                ot.descripcion_tarea, 
                a.estado_tarea,
                tur.nombre_turno
            FROM asignacion_tareas a
            LEFT JOIN tecnicos t ON a.id_tecnico = t.id_tecnico
            LEFT JOIN ordenes_trabajo ot ON a.id_ot = ot.id_ot
            LEFT JOIN aeronaves an ON ot.id_aeronave = an.id_aeronave
            LEFT JOIN turnos tur ON a.id_turno = tur.id_turno
            WHERE a.estado_tarea != 'Completada'
            ORDER BY a.id_asignacion_tarea DESC
        `;
        const [asignaciones] = await db.query(sql);
        res.json(asignaciones);
    } catch (err) {
        console.error("ERROR EN SQL:", err); 
        res.status(500).json({ error: "Error en la consulta de base de datos" });
    }
});
router.put('/finalizar-tarea/:id', async (req, res) => {
    const { id } = req.params; 

    try {
        const sql = "UPDATE asignacion_tareas SET estado_tarea = 'Completada' WHERE id_asignacion_tarea = ?";
        const [resultado] = await db.query(sql, [id]);

        if (resultado.affectedRows > 0) {
            res.json({ mensaje: "✅ Tarea finalizada exitosamente en la base de datos." });
        } else {
            res.status(404).json({ error: "No se encontró la tarea especificada." });
        }

    } catch (err) {
        console.error("Error en el servidor:", err);
        res.status(500).json({ error: "Error interno al intentar cerrar la tarea." });
    }
});
router.get('/conteo-logros', async (req, res) => {
    try {
        const sql = `
            SELECT COUNT(*) as total 
            FROM asignacion_tareas 
            WHERE estado_tarea = 'Completada' 
            AND fecha_ejecucion = CURDATE()
        `;
        const [resultado] = await db.query(sql);
        res.json(resultado[0]); // Devuelve { total: X }
    } catch (err) {
        res.status(500).json({ error: "Error en conteo" });
    }
});

module.exports = router;