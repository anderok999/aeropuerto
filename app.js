async function cargarAsignacionesActivas() {
    try {
        const res = await fetch('http://localhost:3000/api/operaciones/asignaciones-activas');
        const data = await res.json();
        
        const tabla = document.getElementById('tabla-asignaciones');
        if (!tabla) return;
        tabla.innerHTML = '';

        if (Array.isArray(data)) {
            data.forEach(asig => {
                // Creamos UNA SOLA FILA con toda la información y el botón
                tabla.innerHTML += `
                    <tr>
                        <td>${asig.nombre} ${asig.apellido}</td>
                        <td><span class="badge bg-info text-dark">${asig.matricula}</span></td>
                        <td>${asig.descripcion_tarea}</td>
                        <td>${asig.nombre_turno || 'No asignado'}</td>
                        <td><span class="badge bg-warning text-dark">${asig.estado_tarea}</span></td>
                        <td>
                            <button class="btn btn-sm btn-success" onclick="finalizarTarea(${asig.id_asignacion_tarea})">
                                ✅ Finalizar
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
        return data;
    } catch (e) { 
        console.error("Error cargando asignaciones:", e); 
    }
}


async function inicializarDashboard() {
    const tecnicos = await cargarTecnicos();
    const flota = await cargarFlota();
    const asignaciones = await cargarAsignacionesActivas();
    
    // Traemos el conteo de logros directamente del servidor
    const resLogros = await fetch('http://localhost:3000/api/operaciones/conteo-logros');
    const dataLogros = await resLogros.json();

    await prepararFormulario();

    // Pasamos el total de logros a la función
    actualizarIndicadores(tecnicos, flota, asignaciones, dataLogros.total);
}

// Mueve la definición de la función AFUERA para que el código sea limpio
function actualizarIndicadores(tecnicos, flota, asignaciones, totalLogros) {
    if (!tecnicos || !flota || !asignaciones) return;

    // 1. Personal Apto
    document.getElementById('count-aptos').innerText = tecnicos.filter(t => t.estatus_legal === 'APTO').length;

    // 2. Aviones AOG
    document.getElementById('count-aog').innerText = flota.filter(a => a.estado === 'AOG').length;

    // 3. Tareas en Proceso (lo que hay en la tabla actualmente)
    document.getElementById('count-proceso').innerText = asignaciones.length;

    // 4. Logro del Turno (usamos el dato real del servidor)
    document.getElementById('count-completas').innerText = totalLogros || 0;
}

// 1. Cargar la tabla de disponibilidad técnica (Objetivo 3.3.2)
async function cargarTecnicos() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/tecnicos/disponibilidad');
        const tecnicos = await respuesta.json();
        
        const tabla = document.getElementById('tabla-tecnicos');
        if (!tabla) return;
        tabla.innerHTML = '';

        tecnicos.forEach(t => {
            // Validación automática del estatus legal (Objetivo 3.3.2)
            const claseEstatus = t.estatus_legal === 'APTO' ? 'status-apto' : 'status-bloqueado';
            
            const fila = `
                <tr>
                    <td>${t.nombre} ${t.apellido}</td>
                    <td>${t.nombre_especialidad}</td>
                    <td>${new Date(t.fecha_vencimiento).toLocaleDateString()}</td>
                    <td><span class="${claseEstatus}">${t.estatus_legal}</span></td>
                </tr>
            `;
            tabla.innerHTML += fila;
        });
        return tecnicos;
    } catch (error) {
        console.error("Error al conectar con la API de técnicos:", error);
    }
}

// 2. Cargar la flota crítica y órdenes de trabajo (AOG/Mantenimiento)
async function cargarFlota() {
    try {
        const res = await fetch('http://localhost:3000/api/operaciones/flota-critica');
        const flota = await res.json();
        const lista = document.getElementById('lista-aeronaves');
        if (!lista) return;
        lista.innerHTML = '';

        flota.forEach(avion => {
            const priorityClass = avion.estado === 'AOG' ? 'list-group-item-danger' : 'list-group-item-warning';
            lista.innerHTML += `
                <div class="list-group-item ${priorityClass} d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${avion.matricula}</strong><br>
                        <small>${avion.modelo} - OT: ${avion.id_ot || 'Sin OT'}</small>
                    </div>
                    <span class="badge bg-dark">${avion.estado}</span>
                </div>
            `;
        });
        return flota; // Retornamos para usarlo en los selectores
    } catch (error) {
        console.error("Error cargando flota:", error);
    }
}

// 3. Llenar los selectores del formulario de asignación (Módulo de Validación)
async function prepararFormulario() {
    try {
        // Llenar Técnicos Aptos
        const resTec = await fetch('http://localhost:3000/api/tecnicos/disponibilidad');
        const tecnicos = await resTec.json();
        const selectTec = document.getElementById('select-tecnicos');
        
        // Solo mostramos técnicos con licencia VIGENTE (Aptos) 
        selectTec.innerHTML = '<option value="">Seleccione Técnico...</option>' + 
            tecnicos.filter(t => t.estatus_legal === 'APTO')
            .map(t => `<option value="${t.id_tecnico}">${t.nombre} ${t.apellido} (${t.nombre_especialidad})</option>`)
            .join('');

        // Llenar Órdenes de Trabajo (Flota Crítica)
        const resOps = await fetch('http://localhost:3000/api/operaciones/flota-critica');
        const flota = await resOps.json();
        const selectOT = document.getElementById('select-ots');
        
        selectOT.innerHTML = '<option value="">Seleccione Aeronave/OT...</option>' + 
            flota.map(a => `<option value="${a.id_ot}">${a.matricula} - ${a.descripcion_tarea || 'Mantenimiento'}</option>`)
            .join('');

    } catch (error) {
        console.error("Error preparando formulario de asignación:", error);
    }
}
// Función para finalizar una tarea y liberar recursos (Fase 4)
async function finalizarTarea(idAsignacion) {
    // Confirmación de seguridad
    if (!confirm("¿Está seguro de marcar esta tarea como FINALIZADA? Esto liberará al técnico y a la aeronave.")) {
        return;
    }

    try {
        // Llamada a la API con método PUT para actualizar el estado
        const respuesta = await fetch(`http://localhost:3000/api/operaciones/finalizar-tarea/${idAsignacion}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert(resultado.mensaje);
            // Recargamos todo el Dashboard para ver los cambios instantáneamente
            inicializarDashboard(); 
        } else {
            alert("Error: " + resultado.error);
        }

    } catch (error) {
        console.error("Error al conectar con la API:", error);
        alert("No se pudo conectar con el servidor.");
    }
}
function previsualizarReporte() {
    // 1. Agregamos un título temporal para el reporte
    const header = document.createElement('div');
    header.className = 'print-header';
    header.innerHTML = `
        <h1>Boliviana de Aviación - Reporte de Hangar</h1>
        <p>Fecha de emisión: ${new Date().toLocaleString()}</p>
        <hr>
    `;
    document.body.prepend(header);

    // 2. Abrir previsualización
    window.print();

    // 3. Quitar el título después de cerrar la previsualización
    header.remove();
}
// 4. Manejar el envío de la asignación (POST)
const formAsignacion = document.getElementById('form-asignacion');
if (formAsignacion) {
    formAsignacion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = {
            id_tecnico: document.getElementById('select-tecnicos').value,
            id_ot: document.getElementById('select-ots').value,
            id_turno: document.getElementById('select-turnos').value
        };

        try {
            const res = await fetch('http://localhost:3000/api/operaciones/asignar-tarea', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            const resultado = await res.json();
            alert(resultado.mensaje || resultado.error);
            inicializarDashboard(); // Recargar datos tras éxito
        } catch (err) {
            alert("Error al procesar la asignación en el servidor.");
        }
    });
}

// Único evento de inicio
document.addEventListener('DOMContentLoaded', inicializarDashboard);