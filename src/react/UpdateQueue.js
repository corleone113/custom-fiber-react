export class Update {
    constructor(payload) {
        this.payload = payload;
    }
}
// 一个单链表
export class UpdateQueue {
    constructor() {
        this.firstUpdate = null;
        this.lastUpdate = null;
        this.isBatching = false;
        this.callbacks = [];
    }
    setBatching(isBatching){
        this.isBatching = isBatching;
    }
    enqueueUpdate(update, callback, instance) {
        if (this.lastUpdate === null) {
            this.firstUpdate = this.lastUpdate = update;
        } else {
            this.lastUpdate.nextUpdate = update;
            this.lastUpdate = update;
        }
        typeof callback === 'function' && this.callbacks.push(callback);
        if(instance){
            this.recentInstance = instance;
            if(!this.isBatching){
                this.batchUpdate();
            }
        }
    }
    batchUpdate(){
        this.recentInstance.state = this.forceUpdate(this.recentInstance.state);
        this.callbacks.forEach(cb=>cb());
        this.callbacks.length = 0;
    }
    forceUpdate(state) {
        let currentUpdate = this.firstUpdate;
        while (currentUpdate) {
            const nextState = typeof currentUpdate.payload === 'function' ? currentUpdate.payload(state) : currentUpdate.payload;
            state = state instanceof Object ?{
                ...state,
                ...nextState
            } : nextState;
            currentUpdate = currentUpdate.nextUpdate;
        }
        this.firstUpdate = this.lastUpdate = null;
        return state;
    }

}