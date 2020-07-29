import {listenerToUpdater} from './utils';
import {batchingInject} from './updater';
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
    eventStore[eventType] = listener; // 将事件监听器存放在事件函数仓库中
    document.addEventListener(eventType.slice(2), dispatchEvent, false);
}
let syntheticEvent; // 合成事件对象

function dispatchEvent(event) { // event就是原生DOM事件对象
    let {
        type,
        target,
    } = event;
    const eventType = 'on' + type;
    initSyntheticEvent(event); // 初始化syntheticEvent
    while (target) { // 模拟事件冒泡
        const {
            eventStore
        } = target;
        const listener = eventStore && eventStore[eventType]; // 获取事件监听器
        if (listener) {
            const updaters = listenerToUpdater.get(listener); // 获取监听器对应的updater数组
            batchingInject(updaters, listener.bind(null, syntheticEvent)); // 劫持监听器函数，函数执行完毕后批量更新state
        }
        target = target.parentNode;
    }
    for (const key in syntheticEvent) { // 冒泡结束后清空syntheticEvent拷贝自原始事件对象的属性。
        if (key !== 'persist') {
            delete syntheticEvent[key];
        }
    }
}

function persist() { // 改变syntheticEvent的指向，这样上面dispatchEvent中事件冒泡结束后就无法清空拷贝自原始事件对象的属性了。
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
    syntheticEvent.nativeEvent = nativeEvent; // 将原始事件对象保存在nativeEvent上。
    syntheticEvent.currentTarget = nativeEvent.target;
    for (const key in nativeEvent) { // 拷贝原始事件对象上的属性
        if (typeof nativeEvent[key] === 'function') {
            syntheticEvent[key] = nativeEvent[key].bind(nativeEvent);
        } else {
            syntheticEvent[key] = nativeEvent[key];
        }
    }
}