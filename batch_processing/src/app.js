// Arreglo de los procesos
let tape = [];
// Arreglo de ids para comprobar 
let ids = [];
// Tiempo global de ejecución
let globalTime = 1;

function newProcess() {
    let right = document.getElementById('right-side');
    let id = document.getElementById('id').value;
    let operation = document.getElementById('operation').value
        // Se valida que no se pueda dividir entre 0
    if (right.value == 0 && (operation == '/' || operation == '%')) {
        alert('No puedes dividir por 0');
        right.focus();
        return false;
        // También se valida que el id ingresado no sea repetido
    } else if (ids.includes(id)) {
        alert('El ID ya está registrado');
        document.getElementById('id').focus();
        return false;
    }

    // En caso de pasar las validaciones, se agrega el proceso al
    // arreglo de lotes
    let process = new Process(
        document.getElementById('name').value,
        Number(document.getElementById('left-side').value),
        Number(right.value),
        operation,
        Number(document.getElementById('tem').value),
        id
    );

    // Si no hay lotes o si el último lote agreagado está lleno
    if (!tape.length || tape[tape.length - 1].full) {
        let batch = new Batch();
        batch.push(process);
        tape.push(batch);
    } else {
        tape[tape.length - 1].push(process);
    }

    // Se agrega el id al arreglo de ids
    ids.push(id);

    document.getElementById('process-form').reset();
    document.getElementById('name').focus();
    document.getElementById('batch-left').textContent = tape.length;

}

async function run() {
    // No se puede ejecutar si no hay procesos
    if (!tape.length) {
        alert('Debes agregar por lo menos un proceso');
        return false;
    }
    document.getElementById('add-btn').disabled = true;
    document.getElementById('exec-btn').disabled = true;
    let cont = 0;
    // Por cada lote en el arreglo se actualizan las diferentes tablas
    await asyncForEach(tape, async(batch) => {
        document.getElementById('batch-left').textContent = tape.length - cont++;
        createBatchTable(batch.processes);
        let row = document.createElement('tr');
        row.append(document.createElement('td').textContent = 'Lote ' + cont);
        document.getElementById('process-table').append(row);
        // Se actualiza la información del proceso en ejecución
        await asyncForEach(batch.processes, async(process) => {
            document.getElementById('execName').textContent = process.name;
            document.getElementById('execOperation').textContent = process.left + process.operation + (
                process.right < 0 ? '(' + process.right + ')' : process.right
            );
            document.getElementById('execID').textContent = process.id;
            document.getElementById('execTEM').textContent = process.tem;
            document.getElementById('execTE').textContent = 0;
            document.getElementById('execTR').textContent = process.tem;
            await timer(process.tem);
            // Se actualizan las tablas de lote actual y de procesos terminados
            updateBatch();
            finishedProcesses(process);
        });
    });
    document.getElementById('batch-left').textContent = 0;
}

// Implementación de la función sleep
const sleep = (ms) => new Promise(resolver => setTimeout(resolver, ms));

// Función para gestionar tiempos, tanto global como por proceso
async function timer(time) {
    for (let i = time; i > 0; --i, ++globalTime) {
        await sleep(1000);
        document.getElementById('globalTime').textContent = globalTime;
        document.getElementById('execTE').textContent = time - i + 1;
        document.getElementById('execTR').textContent = i - 1;
    }
}

// Implementación de forEach para funcionar de forma asíncrona
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

// Creación de tabla para el lote
function createBatchTable(data) {
    let table = document.getElementById('actual-batch');
    while (table.firstChild) {
        table.removeChild(table.lastChild);
    }
    data.forEach(process => {
        let row = document.createElement('tr');
        let tdName = document.createElement('td');
        let tdTime = document.createElement('td');
        tdName.textContent = process.name;
        tdTime.textContent = process.tem;
        row.append(tdName, tdTime);
        table.append(row);
    });
    table.firstChild.className = 'table-active';
}

// Actualización del lote en ejecución
function updateBatch() {
    let table = document.getElementById('actual-batch');
    table.removeChild(table.firstChild);
    if (table.firstChild) {
        table.firstChild.className = 'table-active';
    }
}

// Creación de la tabla de procesos terminados
function finishedProcesses(process) {
    let table = document.getElementById('process-table');
    let row = document.createElement('tr');
    let tdID = document.createElement('td');
    let tdOp = document.createElement('td');
    let tdRes = document.createElement('td');
    tdID.textContent = process.id;
    tdOp.textContent = process.left + process.operation + (
        process.right < 0 ? '(' + process.right + ')' : process.right
    );
    tdRes.textContent = process.result;
    row.append(tdID, tdOp, tdRes);
    table.append(row);
}