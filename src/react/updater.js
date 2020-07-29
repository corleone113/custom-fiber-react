const updateQueue = {
    updaters: [],
    add(updater) {
        this.updaters.push(updater);
    },
    batchUpdate() {
        let updater;
        while ((updater = this.updaters.pop())) { // 批量更新组件
            updater.updateComponent();
        }
    }
}
export class Updater {
    constructor(compOrHook) {
        this.batching = false; // 表示是否处于批量更新状态
        this.compOrHook = compOrHook; // 对应的组件
        this.pendingStates = []; // 存放state updater
        this.callbacks = []; // 存放state更新后执行的回调
    }
    addState(partialState, callback) {
        this.pendingStates.push(partialState);
        typeof callback === 'function' && this.callbacks.push(callback);
        this.emitUpdate();
    }
    emitUpdate(nextProps) {
        // 如果传递新的属性对象(props更新了)或当前非批量更新状态的话就直接更新
        if (!this.batching) {
            this.updateComponent();
        } else {
            updateQueue.add(this); // 没有传递新的属性对象(没有调用forceUpdate)且处于批量更新状态则将当前updater添加到updateQueue中，稍后更新。
        }
    }
    updateComponent() {
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
                ...state,
                ...nextState
            }:nextState // 进行合并
        }
        this.pendingStates.length = 0; // 更新数组重置为0
        this.callbacks.forEach(cb => cb()); // 遍历执行传入setState的回调
        this.callbacks.length = 0; // 重置回调数组
    }
}
export function batchingInject(updaters, fn) { // 劫持需要批量更新的函数，函数执行完进行批量更新(state)，并返回函数执行结果
    updaters.forEach(updater=>updater.batching=true);
    const ret = fn(); // 执行劫持的函数并保存结果
    updaters.forEach(updater=>updater.batching=false);
    updateQueue.batchUpdate(); // 进行批量更新
    return ret; // 返回结果
}