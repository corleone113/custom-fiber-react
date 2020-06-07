import {updateQueue} from './UpdateQueue';
/**
 * React中事件绑定是按照推荐方式进行的——绑定到document上
 * @param {*} dom 要绑定事件的DOM节点
 * @param {*} eventType 事件的类型
 * @param {*} listener 事件处理函数
 */
export function addEvent(dom, eventType, listener) {
    eventType = eventType.toLowerCase(); // 驼峰命名转换为正确的格式
    // 在绑定事件处理函数的DOM节点上挂载一个事件函数仓库
    const eventStore = dom.eventStore || (dom.eventStore = {});
    eventStore[eventType] = listener;
    document.addEventListener(eventType.slice(2), dispatchEvent, false);
}
let syntheticEvent;

function dispatchEvent(event) { // event就是原生DOM事件对象
    let {
        type,
        target,
    } = event;
    const eventType = 'on' + type;
    // 初始化syntheticEvent
    initSyntheticEvent(event);
    updateQueue.isPending = true; // 开始批量更新状态
    // 模拟事件冒泡
    while (target) {
        const {
            eventStore
        } = target;
        const listener = eventStore && eventStore[eventType];
        if (listener) {
            listener(syntheticEvent);
        }
        target = target.parentNode;
    }
    updateQueue.isPending = false; // 结束批量更新状态并进行批量更新
    updateQueue.batchUpdate();
    for (const key in syntheticEvent) { // 冒泡结束后清空syntheticEvent的属性，之后再传递syntheticEvent都拿不到执行时的属性了。
        if (key !== 'persist') {
            syntheticEvent[key] = null;
        }
    }
}

function persist() {
    syntheticEvent = {
        persist
    };
}

function initSyntheticEvent(nativeEvent) {
    if (!syntheticEvent) {
        syntheticEvent = {
            persist
        };
    }
    syntheticEvent.nativeEvent = nativeEvent;
    syntheticEvent.currentTarget = nativeEvent.target;
    for (const key in nativeEvent) {
        if (typeof nativeEvent[key] === 'function') {
            syntheticEvent[key] = nativeEvent[key].bind(nativeEvent);
        } else {
            syntheticEvent[key] = nativeEvent[key];
        }
    }
}