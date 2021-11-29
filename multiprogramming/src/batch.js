class Batch {
    processes = new Array();
    /**
     * 
     * @param {Process} process 
     */
    push(process) {
        this.processes.push(process);
    }

    get full() {
        return this.processes.length == 4;
    }

    get size() {
        return this.processes.length;
    }
};