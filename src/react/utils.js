import {
    addEvent
} from './event';

function setProp(dom, key, value) {
    if (/^on/.test(key)) {
        addEvent(dom, key, value);
    } else if (key === 'style') {
        for (const styleName in value) {
            dom.style[styleName] = value[styleName];
        }
    } else {
        dom.setAttribute(key, value);
    }
}
export function flatten(array) {
    const flattened = [];
    (function flat(array) {
        array.forEach(item => {
            if (Array.isArray(item)) {
                flat(item);
            } else {
                flattened.push(item);
            }
        })
    })(array);
    return flattened;
}
// 删除/更新/添加属性
export function patchProps(dom, oldProps, newProps) {
    for (const key in oldProps) {
        if (key !== 'children') {
            if (oldProps.hasOwnProperty(key) && !newProps.hasOwnProperty(key)) { // 删除新节点移除的属性
                dom.removeAttribute(key);
            }
        }
    }
    for (const key in newProps) {
        if (key !== 'children') {
            if (oldProps[key] !== newProps[key]) { // 更新有变化或新增的属性
                setProp(dom, key, newProps[key]);
            }
        }
    }
}
export const listenerToUpdater = new WeakMap();
export function fillUpdaterMap(updaters, props) { // 创建事件监听器到updater的映射表(这里使用WeakMap，不用担心内存泄漏)，方便在合成事件中进行批量更新(state)
    for (const key in props) {
        if (/^on/.test(key)) { // 'on'开头表示为事件监听器prop
            listenerToUpdater.set(props[key], updaters);
        }
    }
}