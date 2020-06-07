import {
    addEvent
} from './event';
function setProp(dom, key, value) {
    if (/^on/.test(key)) {
        // dom[key.toLowerCase()] = value;
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