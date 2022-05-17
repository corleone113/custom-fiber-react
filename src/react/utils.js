import {
    addEvent
} from './event';
import { batchingInject } from './updater';

function setProp(dom, key, value) { // 新增/更新attribute
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
export function flatten(array) { // 展开多级数组。
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
        if (key !== 'children' && !newProps.hasOwnProperty(key)) { // 删除新节点移除的属性
            dom.removeAttribute(key);
        }
    }
    for (const key in newProps) {
        if (key !== 'children' && oldProps[key] !== newProps[key]) { // 更新属性或新增属性
            setProp(dom, key, newProps[key]);
        }
    }
}
export function injectListener(updaters, props) {
    for (const key in props) {
        if (/^on/.test(key)) { // 'on'开头表示为事件监听器prop
            const fn = props[key];
            props[key] = (...args) => { // 对监听器进行劫持， 监听器函数执行完后进行批量更新
                batchingInject(updaters, fn.bind(null, ...args));
            }
        }
    }
}