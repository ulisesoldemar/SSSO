document.getElementById('btn-exec').addEventListener('click', (() => {
    // Total de procesos a ejecutar
    let total = Number(document.getElementById('total-process').value);
    if (!total || total < 0) {
        alert('Debes agregar por lo menos un proceso');
        document.getElementById('total-process').focus();
        return false;
    }

    // Tiempo de quantum
    let quantum = Number(document.getElementById('total-quantum').value) * TIME_FACTOR;
    if (quantum < 300 || quantum > 600) {
        alert('El tiempo de quantum debe ser de entre 3 y 6');
        document.getElementById('total-quantum').focus();
        return false;
    }

    // Arreglos de procesos
    let newProcesses = [];
    let readyProcesses = [];
    let lockedProcesses = [];
    let finishedProcesses = [];
    // Proceso en ejecución
    let runningProcess;
    // Bandera para saber si estoy en pausa
    let pauseFlag;
    // Tabla de BCP
    let bcpModal = new bootstrap.Modal(document.getElementById('bcp-modal'));
    // Tablas de páginas
    let pageModal = new bootstrap.Modal(document.getElementById('page-modal'));

    // Memoria
    let memory = new Memory();

    for (let i = 0; i < total; ++i) {
        newProcesses.push(RandomProcess.generate());
    }
    run();

    // Ejecución de los procesos
    async function run() {
        document.getElementById('btn-exec').disabled = true;
        document.getElementById('total-process').disabled = true;
        document.getElementById('total-quantum').disabled = true;
        window.addEventListener('keydown', keyListener);
        document.getElementById('quantum-time').textContent = `${quantum / TIME_FACTOR}`;
        // Se agregan los primeros procesos a los procesos listos
        while (isPullableFromNew()) {
            getNewProcess();
        }
        // Se obtiene el primer proceso a ejecutarse y se agrega un nuevo
        // proceso a la cola de listos debido a que salió uno
        getReadyProcess();
        getNewProcess();
        // Espera a que terminen de ejecutarse todos los procesos
        updateMemory();
        await resolver();

        document.getElementById('new-processes').textContent = '0';

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
    }

    /**
     * Gestiona las colas de procesos.
     * @returns Promesa completada cuando termine de ejecutar todos los procesos
     */
    async function resolver() {
        return new Promise((resolve) => {
            GLOBAL_TIMER
                .action(timer => {
                    // Debido al funcionamiento del crónometro, es necesario revisar
                    // si es el último proceso en ejecutarse
                    if (isLastProcess()) {
                        timer.repeat(timer.currentCycle + runningProcess.remain - 1);
                    }
                    document.getElementById('new-processes').textContent = newProcesses.length;
                    document.getElementById('global-time').textContent = formatTime(timer.currentCycle);
                    if (newProcesses.length) {
                        document.getElementById('next-process-id').textContent = newProcesses[0].id;
                        document.getElementById('next-process-size').textContent = newProcesses[0].size;
                    } else {
                        document.getElementById('next-process-id').textContent = '-'
                        document.getElementById('next-process-size').textContent = '-'
                    }
                    scheduler();
                    updateRunningProcessField();
                    updateReadyProcessTable();
                    updateLockedProcessTable();
                    updateMemory();
                })
                .done(resolve)
                .start();
        });
    }

    /**
     * Planificador. Gestiona las diferentes colas del programa
     * así como el tiempo de quantum.
     */
    function scheduler() {
        if (++runningProcess.service == runningProcess.estimated) {
            runningProcess.result = runningProcess.calc();
            setProcessState(runningProcess, State.FINISHED, 'OK');
            addFinishedProcessToTable();
            finishRunningProcess();
            getReadyProcess();
        } else if (++runningProcess.quantum == quantum) {
            readyProcesses.push(runningProcess);
            setProcessState(runningProcess, State.READY, '-');
            memory.update(runningProcess.id, State.READY);
            getReadyProcess();
        }
        lockedProcesses.forEach((process) => {
            process.info = formatTime(MAX_LOCKED_TIME - (++process.locked));
        });
        getNewProcess();
        getLockedProcess();
    }

    /**
     * Revisa si es posible obtener nuevos procesos de la cola 
     * de listos,
     * @returns true o false
     */
    function isPullableFromNew() {
        if (newProcesses.length) {
            return newProcesses.length > 0 && memory.freeFrames.length >= newProcesses[0].pages;
        }
        return false;
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
    function getNewProcess() {
        if (isPullableFromNew()) {
            let process = newProcesses.shift();
            setProcessState(process, State.READY, '-');
            process.arrival = GLOBAL_TIMER.currentCycle;
            readyProcesses.push(process);
            memory.add(process);
            if (runningProcess == NULL_PROCESS) {
                getReadyProcess();
            }
        }
    }

    /**
     * Si es posible, obtiene el proceso del frente de la cola
     * de procesos listos enviándolo a ejecución y calcula el 
     * tiempo de respuesta del proceso en caso de no haber sido 
     * calculado ya. Si no, ejecuta el proceso nulo.
     */
    function getReadyProcess() {
        if (readyProcesses.length) {
            runningProcess = readyProcesses.shift();
            runningProcess.quantum = 0;
            setProcessState(runningProcess, State.RUNNING, '-');
            if (!runningProcess.replied) {
                runningProcess.response = GLOBAL_TIMER.currentCycle - runningProcess.arrival;
                runningProcess.replied = true;
            }
            memory.update(runningProcess.id, State.RUNNING);
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
    function getLockedProcess() {
        if (lockedProcesses.length && lockedProcesses[0].locked == MAX_LOCKED_TIME) {
            let process = lockedProcesses.shift();
            process.locked = 0;
            setProcessState(process, State.READY, '-');
            readyProcesses.push(process);
            memory.update(process.id, State.READY);
            if (runningProcess == NULL_PROCESS) {
                getReadyProcess();
            }
        }
    }

    /** Envía el proceso en ejecución a la lista de terminados. */
    function finishRunningProcess() {
        runningProcess.ending = GLOBAL_TIMER.currentCycle;
        finishedProcesses.push(runningProcess);
        memory.remove(runningProcess.id);
    }

    /** Reanuda la ejecución del programa */
    const resume = () => {
        console.log('continue');
        pauseFlag = false;
        bcpModal.hide();
        pageModal.hide();
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
                    memory.update(runningProcess.id, State.LOCKED);
                    getReadyProcess();
                }
                break;
            case 'w':
            case 'W':
                if (!pauseFlag && runningProcess != NULL_PROCESS) {
                    console.log('error');
                    // Se envía el proceso en ejecución a terminados con resultado de error
                    runningProcess.result = 'ERROR';
                    setProcessState(runningProcess, State.FINISHED, 'ERROR');
                    finishRunningProcess();
                    addFinishedProcessToTable();
                    // Si no es el último ciclo, obtiene un nuevo proceso, de lo contrario
                    // detiene el cronómetro
                    if (!isLastProcess()) {
                        getNewProcess();
                        getReadyProcess();
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
                    newProcesses.push(RandomProcess.generate());
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
                this.document.getElementById('bcp-time').textContent = `Tiempo global: ${formatTime(GLOBAL_TIMER.currentCycle)}`;
                bcpModal.show();
                break;
            case 't':
            case 'T':
                console.log('page');
                pauseFlag = true;
                GLOBAL_TIMER.pause();
                let mainDiv = document.getElementById('page-table');
                while (mainDiv.firstChild) {
                    mainDiv.removeChild(mainDiv.lastChild);
                }
                if (runningProcess != NULL_PROCESS) {
                    createPageTable([runningProcess]);
                }
                createPageTable(readyProcesses);
                createPageTable(lockedProcesses);
                pageModal.show();
                break;
            default:
                break;
        }
    }

    /********************************************
     *   Funciones de visualización únicamente  *
     ********************************************/

    function updateRunningProcessField() {
        if (runningProcess == NULL_PROCESS && lockedProcesses.length) {
            document.getElementById('exec-id').textContent = 'NULL';
            document.getElementById('exec-operation').textContent = 'NULL';
            document.getElementById('exec-tr').textContent = formatTime(MAX_LOCKED_TIME - lockedProcesses[0].locked - 1);
            document.getElementById('exec-tem').textContent = 'NULL';
            document.getElementById('exec-te').textContent = 'NULL';
            document.getElementById('exec-quantum').textContent = 'NULL';
            document.getElementById('exec-size').textContent = 'NULL';
        } else {
            document.getElementById('exec-id').textContent = runningProcess.id;
            document.getElementById('exec-operation').textContent =
                `${runningProcess.left}${runningProcess.operation}
                ${runningProcess.right < 0 ? `(${runningProcess.right})` : runningProcess.right}`;
            document.getElementById('exec-tr').textContent = formatTime(runningProcess.remain);
            document.getElementById('exec-tem').textContent = formatTime(runningProcess.estimated);
            document.getElementById('exec-te').textContent = formatTime(runningProcess.service);
            document.getElementById('exec-quantum').textContent = formatTime(runningProcess.quantum);
            document.getElementById('exec-size').textContent = runningProcess.size;
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

    function updateMemory() {
        memory.freeFrames.forEach((index) => {
            let progressBar = document.getElementById(`progress-${index}`);
            progressBar.ariaValueNow = '0';
            progressBar.style.width = '0%';
            progressBar.textContent = `0/${FRAME_SIZE}`;

            let page = document.getElementById(`page-${index}`);
            page.textContent = 'free';
        });

        memory.occupiedFrames.forEach((index) => {
            let progressBar = document.getElementById(`progress-${index}`);
            let frame = memory.frames[index];

            switch (frame.state) {
                case State.RUNNING:
                    progressBar.className = 'progress-bar bg-success';
                    break;
                case State.READY:
                    progressBar.className = 'progress-bar bg-info text-dark';
                    break;
                case State.LOCKED:
                    progressBar.className = 'progress-bar bg-warning text-dark';
                    break;
                case 'os':
                    progressBar.className = 'progress-bar bg-secondary';
                    break;
                default:
                    progressBar.className = 'progress-bar';
                    break;
            }

            let progress = frame.size * 100 / FRAME_SIZE;
            progressBar.ariaValueNow = `${progress}`;
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${frame.size}/${FRAME_SIZE}`;

            let page = document.getElementById(`page-${index}`);
            page.textContent = frame.id;
        });

        document.getElementsByName('free-memory').forEach(e => e.textContent = `${memory.free}/${MEMORY_SIZE}`);
        document.getElementsByName('free-frames').forEach(e => e.textContent = `${memory.freeFrames.length}/${TOTAL_FRAMES}`);
        document.getElementsByName('occupied-frames').forEach(e => e.textContent = `${memory.occupiedFrames.length}/${TOTAL_FRAMES}`);
    }

    function addFinishedProcessToTable() {
        let table = document.getElementById('process-table');
        let row = document.createElement('tr');
        let tdID = document.createElement('td');
        let tdOp = document.createElement('td');
        let tdRes = document.createElement('td');
        tdID.textContent = runningProcess.id;
        tdOp.textContent = `${runningProcess.left}${runningProcess.operation}${runningProcess.right < 0 ?
            `(${runningProcess.right})` :
            runningProcess.right}`;
        tdRes.textContent = runningProcess.result;
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
            tdOp.textContent = `${process.left}${process.operation}${process.right < 0 ? `(${process.right})` : process.right
                }`
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
            tdOp.textContent = `${process.left}${process.operation}${process.right < 0 ? `(${process.right})` : process.right
                }`;

            tdRes.textContent = process.result;

            tdTEM.textContent = formatTime(process.estimated);
            tdTREM.textContent = formatTime(process.remain);
            tdTLL.textContent = formatTime(process.arrival);
            tdTF.textContent = formatTime(process.ending);
            tdTRET.textContent = formatTime(process.return);
            tdTESP.textContent = formatTime(process.waiting);
            tdTSER.textContent = formatTime(process.service);
            tdTRES.textContent = formatTime(process.response);
            row.append(tdID, tdState, tdStateInfo, tdOp, tdRes,
                tdTEM, tdTREM, tdTLL, tdTF, tdTRET, tdTESP, tdTSER, tdTRES);
            table.append(row);
        });
    }

    function createPageTable(pageTable) {
        let table = document.getElementById('page-table');
        const createHeader = (text, scope = null, colspan = null) => {
            let th = document.createElement('th');
            if (scope) {
                th.scope = scope;
            }
            if (colspan) {
                th.colSpan = colspan;
            }
            th.textContent = text;
            return th;
        }
        pageTable.forEach((process) => {
            let title = document.createElement('thead');
            let titleRow = document.createElement('tr');
            switch (process.state) {
                case State.RUNNING:
                    titleRow.className = 'table-success';
                    break;
                case State.READY:
                    titleRow.className = 'table-info';
                    break;
                case State.LOCKED:
                    titleRow.className = 'table-warning';
                    break;
                default:
                    break;
            }
            titleRow.append(createHeader(`Proceso: ${process.id}`));
            titleRow.append(createHeader(`Tamaño: ${process.size}`));
            titleRow.append(createHeader(`Páginas: ${process.pages}`));
            title.append(titleRow);

            let header = document.createElement('thead');
            let headerRow = document.createElement('tr');
            headerRow.append(createHeader('Página'), createHeader('Frame', 'col', '2'));
            header.append(headerRow);

            let body = document.createElement('tbody');

            process.pageTable.forEach((frame, page) => {
                let row = document.createElement('tr');
                let tdPage = document.createElement('td');
                tdPage.textContent = page;
                let tdFrame = document.createElement('td');
                tdFrame.textContent = frame;
                tdFrame.colSpan = '2';
                row.append(tdPage, tdFrame);
                body.append(row);
            });
            
            table.append(title, header, body);
        });
    }

    document.getElementsByName('btn-continue').forEach(e => e.addEventListener('click', () => {
        resume();
    }));

}));