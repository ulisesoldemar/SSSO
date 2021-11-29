// Estados del proceso
const State = {
    NEW: 'NEW', 
    READY: 'READY',
    RUNNING: 'RUNNING',
    LOCKED: 'LOCKED',
    FINISHED: 'FINISHED'
}

// Procesos que se simulan
class Process {
    /**
     * @param {*} id 
     * @param {*} left 
     * @param {*} right 
     * @param {*} operation 
     * @param {*} estimated 
     * @param {*} state
     */
    constructor(id, left, right, operation, estimated) {
        this._id = id;
        this._left = left;
        this._right = right;
        this._operation = operation;
        this._estimated = estimated;
        
        this._state = State.NEW;
        this._info = '-';
        
        this._service = 0;
        this._locked = 0;
        this._remain = 'NULL';

        this._arrival = 'NULL';
        this._ending = 'NULL';
        this._return = 'NULL';
        this._waiting = 'NULL';
        this._response = 'NULL';
        
        this._replied = false;
        this._result = 'NULL';

        this._quantum = 0;
    }

    set id(value) {
        this._id = value;
    }

    get id() {
        return this._id;
    }

    set left(value) {
        this._left = value;
    }

    get left() {
        return this._left;
    }

    set right(value) {
        this._right = value;
    }

    get right() {
        return this._right;
    }

    set operation(value) {
        this._operation = value;
    }

    get operation() {
        return this._operation;
    }

    set estimated(value) {
        this._estimated = value;
    }

    get estimated() {
        return this._estimated;
    }

    set state(value) {
        this._state = value;
    }

    get state() {
        return this._state;
    }

    set info(value) {
        this._info = value;
    }

    get info() {
        return this._info;
    }

    /********************************************
     *                  Tiempos                 *
     ********************************************/

    set arrival(value) {
        this._arrival = value;
    }

    get arrival() {
        return this._arrival;
    }

    set ending(value) {
        this._ending = value;
    }

    get ending() {
        return this._ending;
    }

    set return(value) {
        this._return = value;
    }

    get return() {
        return this._return
    }

    set response(value) {
        this._response = value;
    }

    get response() {
        return this._response;
    }

    set quantum(value) {
        this._quantum = value;
    }

    get quantum() {
        return this._quantum;
    }

    set waiting(value) {
        this._waiting = value;
    }

    get waiting() {
        return this._waiting;
    }

    set service(value) {
        this._service = value;
    }

    get service() {
        return this._service;
    }

    set remain(value) {
        this._remain = value;
    }

    get remain() {
        this.calcRemain();
        return this._remain;
    }

    set locked(value) {
        this._locked = value;
    }

    get locked() {
        return this._locked;
    }
    
    /********************************************
     *                 Banderas                 *
     ********************************************/

    set replied(value) {
        this._replied = value;
    }

    get replied() {
        return this._replied;
    }

    /********************************************
     *                 Cálculos                 *
     ********************************************/

    set result(value) {
        this._result = value;
    }

    get result() {
        return this._result;
    }

    calcTimes(globalTime = null) {
        if (this.state != State.FINISHED) {
            if (this.state != State.NEW) {
                this.waiting = globalTime - this.arrival - this.service;
            }
        } else {
            this.return = this.ending - this.arrival;
            this.waiting = this.return - this.service;
        }
    }

    calcRemain() {
        switch (this.state) {
            case State.NEW:
                this.remain = 'NULL';
                break;
            case State.FINISHED:
                this.remain = 0;
                break;
            default:
                this.remain = this.estimated - this.service;
                break;
        }
    }

    calc() {
        switch (this.operation) {
            case '+':
                return this.left + this.right;
            case '-':
                return this.left - this.right;
            case '*':
                return this.left * this.right;
            case '/':
                return this.left / this.right;
            case '%':
                return this.left % this.right;
            case '^':
                return Math.pow(this.left, this.right);
        }
    }
};