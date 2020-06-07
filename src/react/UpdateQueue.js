export const updateQueue = { // 暂时没有想到更好的方案，所以改为一个对象。
    updaters: [],
    callbacks: [],
    isPending: false,
    enqueueUpdate(updater, callback, target) {
        this.target = target;
        this.updaters.push(updater);
        typeof callback === 'function' && this.callbacks.push(callback);
        if(!this.isPending){
            this.batchUpdate();
        }
    },
    batchUpdate(){
        let {state} = this.target;
        for(const updater of this.updaters){
            const nextState = typeof updater === 'function' ? updater(state) : updater;
            state = state instanceof Object ?{
                ...state,
                ...nextState
            } : nextState;
        }
        this.target.state = state;
        this.callbacks.forEach(cb=>cb());
        this.updaters.length = 0;
        this.callbacks.length = 0;
    }
}