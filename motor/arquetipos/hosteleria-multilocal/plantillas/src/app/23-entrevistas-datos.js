// ================= BASE DE ENTREVISTAS =================
// El módulo «Entrevistas» (24-entrevistas.js) guarda candidatos y una lista de alerta. Aquí
// va la SEMILLA: las fichas que la app carga la primera vez. En esta burbuja nace vacía{{#no modulos.entrevistas}}
// y el módulo está apagado en cliente.json (la pestaña no se enseña){{/no}}. Las marcas
// ENTREVISTAS_START/END las usa el servidor para servir la app sin este bloque a quien no
// tiene permiso para ver el contenido de las entrevistas.
const C = o => Object.assign({ nombre: '', tel: '', puesto: null, val: null, motivo: null, nota: '', fecha: null, hab: {} }, o);
/*ENTREVISTAS_START*/
const SEMILLA_ENT_V = 0;
const ENTREVISTAS_SEMILLA = [
];
/*ENTREVISTAS_END*/
