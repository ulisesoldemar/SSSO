// Procesos que se simulan
class Process {
    /**
     * @param {*} id 
     * @param {*} left 
     * @param {*} right 
     * @param {*} operation 
     * @param {*} estimated 
     */
    constructor(id, left, right, operation, estimated) {
        this._id = id;
        this._left = left;
        this._right = right;
        this._operation = operation;
        this._estimated = estimated;
        this._execution = 0;
        this._locked = 0;
        this._arrival = 0;
        this._ending = 0;
        this._waiting = 0;
        this._service = 0;
        this._return = 0;
        this._response = 0;
        this._arrive = false;
        this._replied = false;
        this._result = this.calc();
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

    set execution(value) {
        this._execution = value;
    }

    get execution() {
        return this._execution;
    }

    set locked(value) {
        this._locked = value;
    }

    get locked() {
        return this._locked;
    }

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

    set arrive(value) {
        this._arrive = value;
    }

    get arrive() {
        return this._arrive;
    }

    set replied(value) {
        this._replied = value;
    }

    get replied() {
        return this._replied;
    }

    set result(value) {
        this._result = value;
    }

    get result() {
        return this._result;
    }

    calcTimes() {
        this.service = this.execution;
        this.return = this.ending - this.arrival;
        this.waiting = this.return - this.service;
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