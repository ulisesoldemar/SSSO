// Procesos que se simulan
class Process {
    constructor(name, left, right, operation, tem, id) {
        this.name = name
        this.left = left
        this.right = right
        this.operation = operation
        this.tem = tem
        this.id = id
    }

    get result() {
        return this.calc()
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