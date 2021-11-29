// Procesos que se simulan
class Process {
    /**
     * 
     * @param {*} id 
     * @param {*} estimated 
     * @param {*} left 
     * @param {*} right 
     * @param {*} operation 
     */
    constructor(id, estimated, left, right, operation) {
        this.id = id;
        this.estimated = estimated;
        this._execution = 0;;
        this.left = left;
        this.right = right;
        this.operation = operation;
        this._batchNum = 0;
        this._result = this.calc();
    }

    set execution(value) {
        this._execution = value;
    }

    get execution() {
        return this._execution;
    }

    set batchNum(value) {
        this._batchNum = value;
    }

    get batchNum() {
        return this._batchNum;
    }

    set result(value) {
        this._result = value;
    }

    get result() {
        return this._result;
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