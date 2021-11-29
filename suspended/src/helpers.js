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
const NULL_PROCESS = new Process(null, null, null, null, null, 0);
// Memoria
const MEMORY = new Memory();
// Acceso al archivo
const SUSPENDED_KEY = 'suspended';

function load(key) {
    return JSON.parse(localStorage.getItem(key));
}

function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function deserialize(json) {
    let obj = JSON.parse(json);
    return Object.assign(new Process(), obj);
}

/**
 * Genera un entero aleatorio en el rango [min, max]
 * @param {*} min 
 * @param {*} max 
 * @returns 
 */
function getRndInteger(min = -1000, max = 1000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Clase generadora de procesos.
 */
class RandomProcess {
    static ID = 0;
    /**
     * Genera un proceso aleatorio.
     * @returns new Process()
     */

    static generate() {
        const operators = ['+', '-', '*', '/', '%', '^'];
        const operation = operators[getRndInteger(0, 5)];
        const left = Number(getRndInteger());
        const right = Number(getRndInteger());
        if (right === 0) {
            if (operation === '/' || operation === '%') {
                ++right;
            }
        }
        let process = new Process(
            ++RandomProcess.ID, // ID 
            left, // Operando izquierdo
            right, // Operando derecho
            operation, // Operación
            Number(getRndInteger(6, 15)) * TIME_FACTOR, // TEM
            Number(getRndInteger(6, 25)) // Size
        )
        return process;
    }
}

/** Agrega un 0 a las unidades */
const checkTime = (int) => {
    if (int < 10) { int = `0${int}` };
    return int;
}

/** Da el formato mm:ss al tiempo */
const formatTime = (time) => {
    if (time === 'NULL') {
        return time;
    }
    let m = Math.floor(time / 6000);
    let s = Math.floor((time % 6000) / 100);
    let cs = Math.floor((time % 6000) % 100);
    return `${checkTime(m)}:${checkTime(s)}.${checkTime(cs)}`;
}

const updateText = (id, text) => {
    document.getElementById(id).textContent = text;
}

function drawMemoryTable() {
    let indexCount = 0;
    let table = document.getElementById('memory-table');
    let header = document.createElement('tr');

    const headerMaker = (text) => {
        let th = document.createElement('th');
        th.textContent = text;
        return th;
    }

    header.append(
        headerMaker('Frame'),
        headerMaker('Ocupado'),
        headerMaker('Proceso'),
        headerMaker('Frame'),
        headerMaker('Ocupado'),
        headerMaker('Proceso')
    );
    table.append(header);

    for (let i = 0; i < 20; ++i) {
        let row = document.createElement('tr');
        for (let j = 0; j < 2; ++j) {
            let tdIndex = document.createElement('td');
            tdIndex.textContent = indexCount;
            let tdProcess = document.createElement('td');
            tdProcess.textContent = '-';
            tdProcess.id = `page-${indexCount}`;
            let tdProgress = document.createElement('td');
            let divProgress = document.createElement('div');
            divProgress.className = 'progress';
            let divProgressBar = document.createElement('div');
            divProgressBar.id = `progress-${indexCount}`;
            divProgressBar.className = 'progress-bar';
            divProgressBar.setAttribute('role', 'progressbar');
            divProgress.ariaValueNow = '0';
            divProgress.ariaValueMin = '0';
            divProgress.ariaValueMax = '100';
            divProgress.append(divProgressBar);
            tdProgress.append(divProgress);
            row.append(tdIndex, tdProgress, tdProcess);
            ++indexCount;
        }
        table.append(row);
    }
}

function updateMemory() {
    MEMORY.freeFrames.forEach((index) => {
        let progressBar = document.getElementById(`progress-${index}`);
        progressBar.ariaValueNow = '0';
        progressBar.style.width = '0%';
        progressBar.textContent = `0/${FRAME_SIZE}`;

        let page = document.getElementById(`page-${index}`);
        page.textContent = 'free';
    });

    MEMORY.occupiedFrames.forEach((index) => {
        let progressBar = document.getElementById(`progress-${index}`);
        let frame = MEMORY.frames[index];

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

    document.getElementsByName('free-memory').forEach(e => e.textContent = `${MEMORY.free}/${MEMORY_SIZE}`);
    document.getElementsByName('free-frames').forEach(e => e.textContent = `${MEMORY.freeFrames.length}/${TOTAL_FRAMES}`);
    document.getElementsByName('occupied-frames').forEach(e => e.textContent = `${MEMORY.occupiedFrames.length}/${TOTAL_FRAMES}`);
}

function clearSuspended() {
    localStorage.setItem(SUSPENDED_KEY, JSON.stringify([]));
}