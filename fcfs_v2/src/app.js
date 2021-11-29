// Máxima cantidad de procesos en memoria
const MAX_PROCESSES_IN_MEMORY = 4;
// Factor de tiempo, modificando este valor se sabe si se usarán
// segundos, decimas de segundo, etc.
const TIME_FACTOR = 100;
// Tiempo máximo de espera
const MAX_LOCKED_TIME = 7 * TIME_FACTOR;
// Cronómetro
const GLOBAL_TIMER = new Timer(1000 / TIME_FACTOR);
// Proceso nulo
const NULL_PROCESS = new Process(null, null, null, null, null);

document.getElementById('btn-exec').addEventListener('click', (() => {
    // Arreglos de procesos
    let newProcesses = [];
    let readyProcesses = [];
    let lockedProcesses = [];
    let finishedProcesses = [];
    // Proceso en ejecución
    let runningProcess;
    // ID del último proceso
    let lastID;
    // Bandera para saber si estoy en pausa
    let pauseFlag;
    // Tabla de BCP
    let bcpModal = new bootstrap.Modal(document.getElementById('bcp-modal'));
    // Total de procesos a ejecutar
    let total = Number(document.getElementById('total-process').value);
    // No se puede ejecutar si no hay procesos
    if (!total) {
        alert('Debes agregar por lo menos un proceso');
        return false;
    }
    for (let i = 0; i < total; ++i) {
        newProcesses.push(randProcess(i + 1));
    }
    run();

    // Genera un proceso aleatorio
    function randProcess(id) {
        lastID = id;
        const operators = ['+', '-', '*', '/', '%', '^'];
        const operation = operators[getRndInteger(0, 5)];
        const left = Number(getRndInteger());
        const right = Number(getRndInteger());
        if (right == 0) {
            if (operation == '/' || operation == '%') {
                ++right;
            }
        }
        let process = new Process(
            id, // ID 
            left, // Operando izquierdo
            right, // Operando derecho
            operation, // Operación
            Number(getRndInteger(6, 15)) * TIME_FACTOR// TEM
        )
        return process;
    }

    // Genera un número aleatorio entre min y max, incluyendo ambos
    function getRndInteger(min = -1000, max = 1000) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Ejecución de los procesos
    async function run() {
        document.getElementById('btn-exec').disabled = true;
        document.getElementById('total-process').disabled = true;
        window.addEventListener('keydown', keyListener);
        // Se agregan los primeros procesos a los procesos listos
        while (isPullableFromNew()) {
            pullFromNewProcesses();
        }
        // Se obtiene el primer proceso a ejecutarse y se agrega un nuevo
        // proceso a la cola de listos debido a que salió uno
        pullFromReadyProcesses();
        pullFromNewProcesses();
        // Espera a que terminen de ejecutarse todos los procesos
        await manageProcess();

        document.getElementById('new-processes').textContent = 'Procesos nuevos: 0';

        GLOBAL_TIMER.destroy();
        window.removeEventListener('keydown', keyListener);

        createFinalTable();
        let myModal = new bootstrap.Modal(document.getElementById('end-modal'));
        myModal.show();

        document.getElementById('exec-id').textContent = '-';
        document.getElementById('exec-operation').textContent = '-';
        document.getElementById('exec-tr').textContent = '-';
        document.getElementById('exec-tem').textContent = '-';
        document.getElementById('exec-te').textContent = '-';
        document.getElementById('btn-modal').disabled = false;
        document.getElementById('btn-modal-bcp').disabled = false;
    }

    /**
     * Gestiona las colas de procesos.
     * @returns Promesa completada cuando termine de ejecutar todos los procesos
     */
    async function manageProcess() {
        return new Promise((resolve) => {
            GLOBAL_TIMER
                .action(timer => {
                    // Debido al funcionamiento del crónometro, es necesario revisar
                    // si es el último proceso en ejecutarse
                    if (isLastProcess()) {
                        timer.repeat(timer.currentCycle + runningProcess.remain - 1);
                    }
                    document.getElementById('new-processes').textContent = 'Procesos nuevos: ' + newProcesses.length;
                    document.getElementById('global-time').textContent = formatTime(timer.currentCycle);
                    checkProcessesInMemory();
                    updateRunningProcessField();
                    updateReadyProcessTable();
                    updateLockedProcessTable();
                })
                .done(resolve)
                .start();
        });
    }

    /**
     * Revisa si el proceso en ejecución ha terminado actualiza
     * y las colas de procesos listos y bloqueados.
     */
    function checkProcessesInMemory() {
        if (++runningProcess.service == runningProcess.estimated) {
            runningProcess.result = runningProcess.calc();
            setProcessState(runningProcess, State.FINISHED, 'OK');
            addFinishedProcessToTable(runningProcess);
            pullFromRunningProcess();
            pullFromReadyProcesses();
        }
        lockedProcesses.forEach((process) => {
            process.info = formatTime(MAX_LOCKED_TIME - (++process.locked));
        });
        pullFromNewProcesses();
        pullFromLockedProcesses();
    }

    /**
     * Calcula la cantidad de procesos existentes en memoria
     * contando procesos en ejecución, en cola de listos y en
     * cola de bloqueado.
     * @returns Cantidad de procesos en memoria
     */
    function processesInMemory() {
        let areRunning = runningProcess == NULL_PROCESS ? 0 : 1;
        return readyProcesses.length + lockedProcesses.length + areRunning;
    }

    /**
     * Revisa si es posible obtener nuevos procesos de la cola 
     * de listos,
     * @returns true o false
     */
    function isPullableFromNew() {
        return processesInMemory() < MAX_PROCESSES_IN_MEMORY && newProcesses.length;
    }

    /**
     * Indica si es el último proceso en ejecutarse.
     * @returns true o false
     */
    function isLastProcess() {
        return !newProcesses.length && !readyProcesses.length && !lockedProcesses.length;
    }

    /**
     * Establece los parámetros de estado para la tabla BCP
     * @param {*} process 
     * @param {*} state 
     * @param {*} info 
     */
    function setProcessState(process, state, info) {
        process.state = state;
        process.info = info;
    }

    /**
     * Si es posible, obtiene el proceso del frente de la cola
     * de nuevos y lo agrega la cola de procesos listos. Si el
     * proceso en ejecución es el proceso nulo, entonces envía
     * el proceso obtenido a ejecución.
     */
    function pullFromNewProcesses() {
        if (isPullableFromNew()) {
            let process = newProcesses.shift();
            setProcessState(process, State.READY, '-');
            process.arrival = GLOBAL_TIMER.currentCycle;
            readyProcesses.push(process);
            if (runningProcess == NULL_PROCESS) {
                pullFromReadyProcesses();
            }
        }
    }

    /**
     * Si es posible, obtiene el proceso del frente de la cola
     * de procesos listos enviándolo a ejecución y calcula el 
     * tiempo de respuesta del proceso en caso de no haber sido 
     * calculado ya. Si no, asigna el proceso nulo al proceso 
     * en ejecución.
     */
    function pullFromReadyProcesses() {
        if (readyProcesses.length) {
            runningProcess = readyProcesses.shift();
            setProcessState(runningProcess, State.RUNNING, '-');
            if (!runningProcess.replied) {
                runningProcess.response = GLOBAL_TIMER.currentCycle - runningProcess.arrival;
                runningProcess.replied = true;
            }
        } else {
            runningProcess = NULL_PROCESS;
        }
    }

    /**
     * Si es posible, obtiene el proceso del frente de la cola
     * de procesos bloqueados. Si además el proceso en 
     * ejecución es el proceso nulo, envía el proceso del 
     * frente de procesos listo a ejecución.
     */
    function pullFromLockedProcesses() {
        if (lockedProcesses.length && lockedProcesses[0].locked == MAX_LOCKED_TIME) {
            let process = lockedProcesses.shift();
            process.locked = 0;
            setProcessState(process, State.READY, '-');
            readyProcesses.push(process);
            if (runningProcess == NULL_PROCESS) {
                pullFromReadyProcesses();
            }
        }
    }

    /** Envía el proceso en ejecución a la lista de terminados. */
    function pullFromRunningProcess() {
        runningProcess.ending = GLOBAL_TIMER.currentCycle;
        finishedProcesses.push(runningProcess);
    }

    /** Reanuda la ejecución del programa */
    const resume = () => {
        console.log('continue');
        pauseFlag = false;
        bcpModal.hide();
        GLOBAL_TIMER.resume();
    }

    /** Registra las teclas presionadas */
    function keyListener(event) {
        console.log('Key pressed: ', event.key);
        switch (event.key) {
            case 'e':
            case 'E':
                if (!pauseFlag && runningProcess != NULL_PROCESS) {
                    console.log('interrupt');
                    setProcessState(runningProcess, State.LOCKED, null);
                    // Simplemente envía el proceso en ejecución a la cola de bloqueados
                    lockedProcesses.push(runningProcess);
                    // y envía el primero de la cola de listos a ejecución
                    pullFromReadyProcesses();
                }
                break;
            case 'w':
            case 'W':
                if (!pauseFlag && runningProcess != NULL_PROCESS) {
                    console.log('error');
                    // Se envía el proceso en ejecución a terminados con resultado de error
                    runningProcess.result = 'ERROR';
                    setProcessState(runningProcess, State.FINISHED, 'ERROR');
                    pullFromRunningProcess();
                    addFinishedProcessToTable(runningProcess);
                    // Si no es el último ciclo, obtiene nuevos procesos, de lo contrario
                    // detiene el cronómetro
                    if (!isLastProcess()) {
                        pullFromNewProcesses();
                        pullFromReadyProcesses();
                    } else {
                        console.log('Error');
                        GLOBAL_TIMER.repeat(false);
                    }
                }
                break;
            case 'p':
            case 'P':
                console.log('pause');
                pauseFlag = true;
                GLOBAL_TIMER.pause();
                break;
            case 'c':
            case 'C':
                resume();
                break;
            case 'n':
            case 'N':
                if (!pauseFlag) {
                    console.log('new');
                    GLOBAL_TIMER.repeat(true);
                    // Simplemente se envía un proceso aleatorio a la cola
                    // de procesos nuevos
                    newProcesses.push(randProcess(lastID + 1));
                }
                break;
            case 'b':
            case 'B':
                console.log('bcp');
                pauseFlag = true;
                GLOBAL_TIMER.pause();
                let table = document.getElementById('bcp-table');
                while (table.firstChild) {
                    table.removeChild(table.lastChild);
                }
                if (runningProcess != NULL_PROCESS) {
                    createBCPTable([runningProcess], 'table-success');
                }
                createBCPTable(newProcesses, 'table-primary');
                createBCPTable(readyProcesses, 'table-secondary');
                createBCPTable(lockedProcesses, 'table-warning');
                createBCPTable(finishedProcesses, 'table-info');
                this.document.getElementById('bcp-time').textContent = formatTime(GLOBAL_TIMER.currentCycle);
                bcpModal.show();
                break;
            default:
                break;
        }
    }

    /********************************************
     *   Funciones de visualización únicamente  *
     ********************************************/

    /** Agrega un 0 a las unidades */
    const checkTime = (int) => {
        if (int < 10) { int = '0' + int };
        return int;
    }

    /** Da el formato mm:ss al tiempo */
    const formatTime = (time) => {
        let m = Math.floor(time / 6000);
        let s = Math.floor((time % 6000) / 100);
        let cs = Math.floor((time % 6000) % 100);
        return checkTime(m) + ':' + checkTime(s) + '.' + checkTime(cs);
    }

    /** Da formato en caso de que el valor sea nulo */
    const formatIfNull = (time) => {
        return time == 'NULL' ? 'NULL' : formatTime(time);
    }

    function updateRunningProcessField() {
        if (runningProcess == NULL_PROCESS && lockedProcesses.length) {
            document.getElementById('exec-id').textContent = 'NULL';
            document.getElementById('exec-operation').textContent = 'NULL';
            document.getElementById('exec-tr').textContent = formatTime(MAX_LOCKED_TIME - lockedProcesses[0].locked - 1);
            document.getElementById('exec-tem').textContent = 'NULL';
            document.getElementById('exec-te').textContent = 'NULL';
        } else {
            document.getElementById('exec-id').textContent = runningProcess.id;
            document.getElementById('exec-operation').textContent = runningProcess.left + runningProcess.operation + (
                runningProcess.right < 0 ? '(' + runningProcess.right + ')' : runningProcess.right
            );
            document.getElementById('exec-tr').textContent = formatTime(runningProcess.remain);
            document.getElementById('exec-tem').textContent = formatTime(runningProcess.estimated);
            document.getElementById('exec-te').textContent = formatTime(runningProcess.service);
        }
    }

    function updateReadyProcessTable() {
        let table = document.getElementById('ready-table');
        while (table.firstChild) {
            table.removeChild(table.lastChild);
        }
        readyProcesses.forEach((process) => {
            let row = document.createElement('tr');
            let tdID = document.createElement('td');
            let tdTime = document.createElement('td');
            let tdTimeEx = document.createElement('td');
            tdID.textContent = process.id;
            tdTime.textContent = formatTime(process.estimated);
            tdTimeEx.textContent = formatTime(process.service);
            row.append(tdID, tdTime, tdTimeEx);
            table.append(row);
        });
    }

    function updateLockedProcessTable() {
        let table = document.getElementById('locked-table');
        while (table.firstChild) {
            table.removeChild(table.lastChild);
        }
        lockedProcesses.forEach((process) => {
            let row = document.createElement('tr');
            let tdID = document.createElement('td');
            let tdLockedTime = document.createElement('td');
            tdID.textContent = process.id;
            tdLockedTime.textContent = formatTime(process.locked);
            row.append(tdID, tdLockedTime);
            table.append(row);
        });
    }

    function addFinishedProcessToTable(process) {
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

    function createFinalTable() {
        let table = document.getElementById('final-table')
        finishedProcesses.forEach((process) => {
            process.calcTimes();
            let row = document.createElement('tr');
            let tdID = document.createElement('td');
            let tdOp = document.createElement('td');
            let tdRes = document.createElement('td');
            let tdTEM = document.createElement('td');
            let tdTLL = document.createElement('td');
            let tdTF = document.createElement('td');
            let tdTRET = document.createElement('td');
            let tdTRES = document.createElement('td');
            let tdTESP = document.createElement('td');
            let tdTSER = document.createElement('td');
            tdID.textContent = process.id;
            tdOp.textContent = process.left + process.operation + (
                process.right < 0 ? '(' + process.right + ')' : process.right
            );
            tdRes.textContent = process.result;
            tdTEM.textContent = formatTime(process.estimated);
            tdTLL.textContent = formatTime(process.arrival);
            tdTF.textContent = formatTime(process.ending);
            tdTRET.textContent = formatTime(process.return);
            tdTRES.textContent = formatTime(process.response);
            tdTESP.textContent = formatTime(process.waiting);
            tdTSER.textContent = formatTime(process.service);
            row.append(tdID, tdOp, tdRes, tdTEM, tdTLL, tdTF, tdTRET, tdTRES, tdTESP, tdTSER);
            table.append(row);
        });
    }

    function createBCPTable(stateTable, tableClass) {
        let table = document.getElementById('bcp-table');
        stateTable.forEach((process) => {
            process.calcTimes(GLOBAL_TIMER.currentCycle);
            let row = document.createElement('tr');
            row.className = tableClass;
            let tdID = document.createElement('td');
            let tdState = document.createElement('td');
            let tdStateInfo = document.createElement('td');
            let tdOp = document.createElement('td');
            let tdRes = document.createElement('td');

            let tdTEM = document.createElement('td');
            let tdTREM = document.createElement('td');
            let tdTLL = document.createElement('td');
            let tdTF = document.createElement('td');
            let tdTRET = document.createElement('td');
            let tdTESP = document.createElement('td');
            let tdTSER = document.createElement('td');
            let tdTRES = document.createElement('td');

            tdID.textContent = process.id;
            tdState.textContent = process.state;
            tdStateInfo.textContent = process.info;
            tdOp.textContent = process.left + process.operation + (
                process.right < 0 ? '(' + process.right + ')' : process.right
            );
            tdRes.textContent = process.result;

            tdTEM.textContent = formatTime(process.estimated);
            tdTREM.textContent = formatIfNull(process.remain);
            tdTLL.textContent = formatIfNull(process.arrival);
            tdTF.textContent = formatIfNull(process.ending);
            tdTRET.textContent = formatIfNull(process.return);
            tdTESP.textContent = formatIfNull(process.waiting);
            tdTSER.textContent = formatIfNull(process.service);
            tdTRES.textContent = formatIfNull(process.response);
            row.append(tdID, tdState, tdStateInfo, tdOp, tdRes,
                tdTEM, tdTREM, tdTLL, tdTF, tdTRET, tdTESP, tdTSER, tdTRES);
            table.append(row);
        });
    }

    document.getElementById('btn-continue').addEventListener('click', () => {
        resume();
    })

}));