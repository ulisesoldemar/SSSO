// Arreglo de los procesos
let tape = [];
// Cronómetros
const GLOBAL_TIMER = new Timer(1000);
const PROCESS_TIMER = new Timer(10);
// Variable para modificar el lote en ejecución
let runningBatch;
// Señales para detener el proceso en ejecución
let abortController;
let abortSignal;
// Bandera para saber si estoy en pausa
let pause;
// Contador de procesos
let batchCont = 1;

function newProcess() {
    let total = Number(document.getElementById('total-process').value);
    // No se puede ejecutar si no hay procesos
    if (!total) {
        alert('Debes agregar por lo menos un proceso');
        return false;
    }
    for (let i = 0; i < total; ++i) {
        // Si no hay lotes o si el último lote agreagado está lleno
        if (!tape.length || tape[tape.length - 1].full) {
            let batch = new Batch();
            batch.push(randProcess(i + 1));
            tape.push(batch);
        } else {
            tape[tape.length - 1].push(randProcess(i + 1));
        }
    }
    run();
    keyListener();
}

// Genera un proceso aleatorio
function randProcess(id) {
    let operators = ['+', '-', '*', '/', '%', '^'];
    let operation = operators[getRndInteger(0, 5)];
    let left = Number(getRndInteger());
    let right = Number(getRndInteger());
    if (right == 0)
        if (operation == '/' || operation == '%')
            ++right;
    let process = new Process(
        id, // ID 
        Number(getRndInteger(6, 15)) * 100, // TEM
        left, // Operando izquierdo
        right, // Operando derecho
        operation // Operación
    )
    return process;
}

// Genera un número aleatorio entre min y max, incluyendo ambos
function getRndInteger(min = -1000, max = 1000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Ejecución de los procesos
async function run() {
    document.getElementById('exec-btn').disabled = true;
    document.getElementById('total-process').disabled = true;
    abortController = new AbortController();
    GLOBAL_TIMER
        .action(t => {
            let m = Math.floor(t.currentCycle / 60);
            let s = Math.floor(t.currentCycle % 60);
            document.getElementById('globalTime').textContent = checkTime(m) + ':' + checkTime(s);
        })
        .start();
    await manageBatch();
    document.getElementById('batch-left').textContent = '0';
    GLOBAL_TIMER.destroy();
    PROCESS_TIMER.destroy();
}

// Modifica los procesos en ejecución en base a las entradas del usuario
async function manageBatch() {
    while (tape.length) {
        document.getElementById('batch-left').textContent = tape.length;
        runningBatch = tape.shift();
        createBatchTable();
        let row = (document
                .createElement('tr')
                .className = 'table-active')
            .textContent = 'Lote ' + batchCont;
        document.getElementById('process-table').append(row);
        while (runningBatch.processes.length) {
            abortController = new AbortController();
            abortSignal = abortController.signal;
            let process = runningBatch.processes[0];
            process.batchNum = batchCont;
            document.getElementById('execID').textContent = process.id;
            document.getElementById('execOperation').textContent = process.left + process.operation + (
                process.right < 0 ? '(' + process.right + ')' : process.right
            );
            document.getElementById('execTEM').textContent = formatTime(process.estimated);
            try {
                await updateProcess(process, abortSignal);
                finishedProcesses(process);
                runningBatch.processes.shift();
                updateBatch();
            } catch (err) {
                console.warn(err);
                continue;
            } finally {
                PROCESS_TIMER.reset();
                delete abortController;
            }
        }
        ++batchCont;
    }
}

// Actualización de los cronómetros de los procesos, tanto
// en proceso en ejecución, como en el lote en ejecución
function updateProcess(process, signal) {
    return new Promise((resolve, reject) => {
        const error = new Error('Detenido por usuario', 'AbortError');
        PROCESS_TIMER
            .action(t => {
                document.getElementById('execTR').textContent = formatTime(process.estimated - process.execution);
                document.getElementById('execTE').textContent = formatTime(process.execution);
                ++process.execution;
            })
            .repeat((process.estimated - process.execution))
            .done(resolve)
            .start();
        signal.addEventListener('abort', () => {
            PROCESS_TIMER.reset();
            PROCESS_TIMER.stop();
            reject(error);
        });
    });
}

// Manejo de entradas del teclado
function keyListener() {
    window.addEventListener(
        'keydown',
        function(event) {
            console.log('Key pressed: ', event.key);
            switch (event.key) {
                case 'e':
                case 'E':
                    if (!pause && runningBatch.processes.length > 1) {
                        console.log('interrupt');
                        abortController.abort();
                        runningBatch.processes.push(runningBatch.processes.shift());
                        createBatchTable();
                    }
                    break;
                case 'w':
                case 'W':
                    if (!pause) {
                        console.log('error');
                        abortController.abort();
                        let process = runningBatch.processes.shift();
                        process.result = 'ERROR';
                        finishedProcesses(process);
                        updateBatch();
                    }
                    break;
                case 'p':
                case 'P':
                    console.log('pause');
                    pause = true;
                    GLOBAL_TIMER.pause();
                    PROCESS_TIMER.pause();
                    break;
                case 'c':
                case 'C':
                    console.log('continue');
                    pause = false;
                    GLOBAL_TIMER.resume();
                    PROCESS_TIMER.resume();
                    break;
                default:
                    break;
            }
        }
    )
}


// Agrega un 0 a las unidades
const checkTime = (int) => {
    if (int < 10) { int = '0' + int };
    return int;
}

const formatTime = (time) => {
    let m = Math.floor(time / 6000)
    let s = Math.floor((time % 6000) / 100);
    let cs = Math.floor((time % 6000) % 100);
    console.log(m + ':' + s);
    return checkTime(m) + ':' + checkTime(s) + '.' + checkTime(cs);
}

// Creación de tabla para el lote
function createBatchTable() {
    let data = runningBatch.processes;
    let table = document.getElementById('actual-batch');
    while (table.firstChild) {
        table.removeChild(table.lastChild);
    }
    for (let i = 1; i < data.length; ++i) {
        let process = data[i];
        let row = document.createElement('tr');
        let tdID = document.createElement('td');
        let tdTime = document.createElement('td');
        let tdTimeEx = document.createElement('td');
        tdID.textContent = process.id;
        tdTime.textContent = formatTime(process.estimated);
        tdTimeEx.textContent = formatTime(process.execution);
        row.append(tdID, tdTime, tdTimeEx);
        table.append(row);
        nl = process.batchNum;
    }
    document.getElementById('running-batch').textContent = batchCont;
}

// Actualización visual del lote en ejecución
function updateBatch() {
    let table = document.getElementById('actual-batch');
    table.removeChild(table.firstChild);
}

// Creación de la tabla de procesos terminados
function finishedProcesses(process) {
    let table = document.getElementById('process-table');
    let row = document.createElement('tr');
    let tdID = document.createElement('td');
    let tdOp = document.createElement('td');
    let tdRes = document.createElement('td');
    let tdNL = document.createElement('td');
    tdID.textContent = process.id;
    tdOp.textContent = process.left + process.operation + (
        process.right < 0 ? '(' + process.right + ')' : process.right
    );
    tdRes.textContent = process.result;
    tdNL.textContent = process.batchNum;
    row.append(tdID, tdOp, tdRes, tdNL);
    table.append(row);
}