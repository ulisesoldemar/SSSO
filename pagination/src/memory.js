const MEMORY_SIZE = 200;
const FRAME_SIZE = 5;
const TOTAL_FRAMES = Math.floor(MEMORY_SIZE / FRAME_SIZE);

class Memory {
    constructor() {
        this.frames = [];
        for (let i = 0; i < TOTAL_FRAMES; ++i) {
            this.frames.push({
                id: null,
                size: 0,
                state: null
            });
        }
        this.add({ id: 'os', size: 10, state: 'os', pages: 2 });
    }

    add(process) {
        let done = 0;
        let i = 0;
        while (done < process.pages) {
            if (this.frames[i].id === null) {
                this.frames[i].id = process.id;
                this.frames[i].size = FRAME_SIZE;
                this.frames[i].state = process.state;
                process.pageTable = i;
                ++done;
            }
            ++i;
        }
        let low = process.size % FRAME_SIZE;
        if (low) {
            this.frames[i - 1].size = low;
        }
    }

    update(id, state) {
        this.frames.forEach((frame) => {
            if (frame.id == id) {
                frame.state = state;
            }
        });
    }

    remove(id) {
        this.frames.forEach((frame) => {
            if (frame.id === id) {
                frame.id = null;
                frame.size = 0;
                frame.state = null;
            }
        });
    }

    clean() {
        this.frames.forEach((frame) => {
            if (frame.id !== 'os') {
                frame.id = null;
                frame.size = 0;
                frame.state = null;
            }
        });
    }

    get freeFrames() {
        return this.frames
            .map((frame, index) => {
                if (frame.id === null) return index
            })
            .filter(index => index !== undefined);
    }

    get occupiedFrames() {
        return this.frames
            .map((frame, index) => {
                if (frame.id !== null) return index
            })
            .filter(index => index !== undefined);
    }

    get free() {
        return MEMORY_SIZE - this.frames.reduce((sum, frame) => {
            return sum += frame.size;
        }, 0);
    }

}