import {
    TEXT,
    REACT_ELEMENT,
    CLASS_COMPONENT,
    FUNCTION_COMPONENT,
} from './constants';
import {useReducer, useState} from '../scheduler'

import {
    flatten
} from './utils';
import {
    ReactElement,
} from './ReactElement';
import {updateQueue,} from './UpdateQueue';
import {scheduleRoot} from '../scheduler';

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
    if (typeof type === 'string') {
        $$typeof = REACT_ELEMENT;
    } else if (typeof type === 'function' && type.prototype && type.prototype.isComponent) {
        $$typeof = CLASS_COMPONENT;
    } else if (typeof type === 'function') {
        $$typeof = FUNCTION_COMPONENT;
    }
    children = flatten(children);
    props.children = children.map(child => {
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
    }
    setState(updater,callback) {
        if(typeof updater !== 'object' && typeof updater !== 'function') {
            throw new Error('Expected updater passed to setState is a object or function.');
        }
        updateQueue.enqueueUpdate(updater, callback, this);
        scheduleRoot();
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