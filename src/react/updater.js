const updateQueue = {
    updaters: [],
    add(updater) { // 添加updater
        this.updaters.push(updater);
    },
    batchUpdate() {
        for(const updater of this.updaters){
            updater.updateCompOrHook();
        }
        let updater;
        while ((updater = this.updaters.pop())) { // 批量更新组件
            updater.executeCallbacks();
        }
    }
}
export class Updater {
    constructor(compOrHook) {
        this.batching = false; // 表示是否处于批量更新状态
        this.compOrHook = compOrHook; // 对应的组件实例或hook对象
        this.pendingStates = []; // 存放state updater
        this.callbacks = []; // 存放state更新后执行的回调
    }
    addState(partialState, callback) { // 添加state updater和state更新后的回调
        this.pendingStates.push(partialState);
        typeof callback === 'function' && this.callbacks.push(callback);
        this.emitUpdate();
    }
    emitUpdate() {
        if (!this.batching) { // 非批量更新状态则直接更新state
            this.updateCompOrHook();
        } else {
            updateQueue.add(this); // 处于批量更新状态则将当前updater添加到updateQueue中，稍后更新。
        }
    }
    executeCallbacks(){
        this.callbacks.forEach(cb => cb()); // 遍历执行传入setState的回调
        this.callbacks.length = 0; // 重置回调数组
    }
    updateCompOrHook() {
        const {
            pendingStates,
            compOrHook,
        } = this;
        for (const partialState of pendingStates) { // 批量更新state
            const {
                state,
                props,
            } = compOrHook;
            const nextState = typeof partialState === 'function' ? partialState(state, props): partialState;
            compOrHook.state = nextState instanceof Object ? {
                ...state, // 进行合并
                ...nextState
            }:nextState // hook state有可能时非对象。
        }
        this.pendingStates.length = 0; // 重置state更新器数组
    }
}
export function batchingInject(updaters, fn) { // 劫持需要批量更新的函数，函数执行完进行批量更新(state)，并返回函数执行结果
    updaters.forEach(updater=>updater.batching=true); // 打开批量更新状态。updaters中updater的添加顺序是按照父子关系添加的，先父后子，所以能保证子组件调用父组件setState时的执行顺序
    const ret = fn(); // 执行劫持的函数并保存结果
    updaters.forEach(updater=>updater.batching=false); // 关闭批量更新状态。
    updateQueue.batchUpdate(); // 进行批量更新
    return ret; // 返回结果
}