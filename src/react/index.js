import {
    TEXT,
    REACT_ELEMENT,
    CLASS_COMPONENT,
    FUNCTION_COMPONENT,
} from './constants';
import {useReducer, useState} from '../fiber'

import {
    flatten
} from './utils';
import {
    ReactElement,
} from './ReactElement';
import {scheduleRoot} from '../fiber';
import {Updater} from './updater';

function createElement(type, config = {}, ...children) {
    let key, ref, props = {};
    if (config) {
        // 编译后产生的属性，基本没什么用，可以删掉
        delete config.__source;
        delete config.__self;
        delete config.__store;
        ({
            key,
            ref,
            ...props
        } = config);
    }
    let $$typeof;
    if (typeof type === 'string') { // type为字符串则表示是HTML元素节点
        $$typeof = REACT_ELEMENT;
    } else if (typeof type === 'function' && type.prototype && type.prototype.isComponent) { // 说明是是类组件，通过isComponent判断
        $$typeof = CLASS_COMPONENT;
    } else if (typeof type === 'function') { // 说明是函数组件
        $$typeof = FUNCTION_COMPONENT;
    }
    children = flatten(children);
    props.children = children.map(child => { // babel转码器不会将children中的函数和文本转化createElement调用
        if (typeof child === 'object' || typeof child === 'function') {
            return child;
        } else {
            return {
                $$typeof: TEXT,
                type: 'text',
                props:{
                    children: ''+child,
                }
            };
        }
    });
    return ReactElement($$typeof, type, key, ref, props);
}

class Component {
    static contextType = null;
    constructor(props = {}, context) {
        this.props = props;
        this.context = context;
        this.updater = new Updater(this); // 创建对应的updater实例
    }
    setState(partialState,callback) {
        if(typeof partialState !== 'object' && typeof partialState !== 'function') {
            throw new Error('Expected updater passed to setState is a object or function.');
        }
        this.updater.addState(partialState, callback); // 尝试更新state
        scheduleRoot(); // 唤起fiber任务——重新渲染。
    }
}
Component.prototype.isComponent = {};
export {
    createElement,
    Component,
    useReducer,
    useState,
}
export default {
    createElement,
    Component,
    useReducer,
    useState,
}