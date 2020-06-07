import {
    TAG_ROOT,
    REACT_ELEMENT,
    TAG_TEXT,
    TAG_HOST,
    TEXT,
    PLACEMENT,
    DELETE,
    UPDATE,
    TAG_CLASS,
    CLASS_COMPONENT,
    TAG_FUNCTION,
    FUNCTION_COMPONENT,
} from '../react/constants';
import {
    patchProps
} from '../react/utils';
import {
    updateQueue
} from '../react/UpdateQueue';
/**
 * 从根节点开始渲染和调度
 * 分为两个阶段：
 *  1. reconcile阶段——这个阶段比较费时间，所以将任务拆分为多步，这个阶段用于初始化/更新Fiber(执行顺序为先序遍历)，然后收集副作用(执行过程是后续遍历)并生成fiber树，这个阶段是可以中断的。
 *  2. 提交阶段，这个阶段是同步完成的，类似于回调，且不能中断，依次执行收集的副作用(后续遍历)。
 */
let nextUnitOfWork = null; // 下一个fiber执行单元
let workInProgressRoot = null; // 正在渲染的根fiber
let currentRoot = null; // 渲染成功后当前根fiber
const deletions = []; // 进行节点删除的fiber并不放在fiber链表中，而是需要单独记录并执行
let workInProgressFunction = null; // 正在工作的Fiber
let hookIndex = 0; // hook检索的索引
export function scheduleRoot(rootFiber) {
    if (currentRoot && currentRoot.alternate) { // 偶数次更新——双缓冲机制
        workInProgressRoot = currentRoot.alternate; // 指向第一次渲染时的哪个fiber链表。
        rootFiber && (workInProgressRoot.props = rootFiber.props); // 更新props
        workInProgressRoot.alternate = currentRoot;
    } else if(currentRoot){ // 奇数次更新——双缓冲机制
        workInProgressRoot = { ...currentRoot, alternate: currentRoot};
    } else {
        workInProgressRoot = rootFiber;
    }
    workInProgressRoot.firstEffect = workInProgressRoot.lastEffect = workInProgressRoot.nextEffect = null;
    nextUnitOfWork = workInProgressRoot;
}

function performUnitOfWork(currentFiber) {
    beginWork(currentFiber);
    if (currentFiber.child) {
        return currentFiber.child;
    }
    while (currentFiber) {
        completeUnitOfWork(currentFiber);
        if (currentFiber.sibling)
            return currentFiber.sibling;
        currentFiber = currentFiber.return;
    }
}
// 在完成时候收集副作用，然后按照后续遍历的顺序组成effect链表
function completeUnitOfWork(currentFiber) {
    const returnFiber = currentFiber.return;
    if (returnFiber) {
        if (!returnFiber.firstEffect) {// 说明currentFiber是returnFiber第一个儿子，不过优先处理currentFiber儿子的副作用
            returnFiber.firstEffect = currentFiber.firstEffect;
        }
        if (currentFiber.lastEffect) { // 说明currentFiber的儿子确实有副作用。
            if (returnFiber.lastEffect) { // 说明currentFiber不是returnFiber第一个儿子，所以它儿子们的副作用要排到后面去
                returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
            }
            returnFiber.lastEffect = currentFiber.lastEffect; // 将lastEffect指向正确的位置
        }
        const effectTag = currentFiber.effectTag;
        if (effectTag) { // currentFiber自己有副作用则在儿子的副作用之后处理
            if (returnFiber.lastEffect) {// 说明currentFiber不是第一个儿子，所以它的副作用要排在后面
                returnFiber.lastEffect.nextEffect = currentFiber;
            } else {
                returnFiber.firstEffect = currentFiber;// 说明currentFiber是第一个儿子，且它的子Fiber没有副作用或没有子fiber。
            }
            returnFiber.lastEffect = currentFiber; // 将lastEffect指向正确的位置
        }
    }
}
// beginWork对应reconcile阶段
function beginWork(currentFiber) {
    if (currentFiber.tag === TAG_ROOT) {
        updateHostRoot(currentFiber);
    } else if (currentFiber.tag === TAG_TEXT) {
        updateHostText(currentFiber);
    } else if (currentFiber.tag === TAG_HOST) {
        updateHost(currentFiber);
    } else if (currentFiber.tag === TAG_CLASS) {
        updateClassComponent(currentFiber);
    } else if (currentFiber.tag === TAG_FUNCTION) {
        updateFunctionComponent(currentFiber);
    }
}

function updateFunctionComponent(currentFiber) {
    workInProgressFunction = currentFiber;
    hookIndex = 0;
    workInProgressFunction.hooks = [];
    const newElement = currentFiber.type(currentFiber.props);
    reconcileChildren(currentFiber, [newElement]);
}

function updateHost(currentFiber) {
    if (!currentFiber.stateNode) {
        currentFiber.stateNode = createDOM(currentFiber);
    }
    const newChildren = currentFiber.props.children;
    reconcileChildren(currentFiber, newChildren);
}

function createDOM(currentFiber) {
    if (currentFiber.tag === TAG_TEXT) {
        return document.createTextNode(currentFiber.props.children);
    } else if (currentFiber.tag === TAG_HOST) {
        const stateNode = document.createElement(currentFiber.type);
        patchProps(stateNode, {}, currentFiber.props);
        return stateNode;
    }
}

function updateHostText(currentFiber) {
    if (!currentFiber.stateNode) {
        currentFiber.stateNode = createDOM(currentFiber);
    }
}

function updateClassComponent(currentFiber) {
    if (!currentFiber.stateNode) { // 类组件stateNode为其实例
        currentFiber.stateNode = new currentFiber.type(currentFiber.props);
    }
    currentFiber.stateNode.props = currentFiber.props; // 更新props
    // 给组件实例的state赋值
    const newElement = currentFiber.stateNode.render();
    reconcileChildren(currentFiber, [newElement]);
}

function updateHostRoot(currentFiber) {
    const newChildren = currentFiber.props.children;
    reconcileChildren(currentFiber, newChildren);
}

function getOldFiberMap(oldFiber) { // 生成旧Fiber链表的map
    let i = 0;
    const map = {};
    let nextFiber = oldFiber;
    while (nextFiber) {
        nextFiber._mountIndex = i;
        const key = nextFiber.key || i.toString();
        map[key] = nextFiber;
        ++i;
        nextFiber = nextFiber.sibling;
    }
    return map;
}

function reconcileChildren(currentFiber, newChildren) {
    let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
    oldFiber && (oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null);
    let prevSibling;
    let newFiber;
    currentFiber.child = null; // 清除之前的子fiber(对非初次渲染)
    const oldFiberMap = getOldFiberMap(oldFiber); // 获取旧fiber的map
    let newChildIndex = 0;
    let lastIndex = 0;
    while (newChildIndex < newChildren.length) {
        let tag;
        const newChild = newChildren[newChildIndex];
        const newKey = (newChild && newChild.key) || newChildIndex.toString();
        let foundFiber = oldFiberMap[newKey] || {};
        if (foundFiber.type !== newChild.type) { // 类型不同不会复用
            foundFiber = null;
        }
        if (newChild && newChild.$$typeof === TEXT) {
            tag = TAG_TEXT;
        } else if (newChild && newChild.$$typeof === REACT_ELEMENT) {
            tag = TAG_HOST;
        } else if (newChild && newChild.$$typeof === CLASS_COMPONENT) {
            tag = TAG_CLASS;
        } else if (newChild && newChild.$$typeof === FUNCTION_COMPONENT) {
            tag = TAG_FUNCTION;
        }
        if (foundFiber) {
            if (foundFiber.alternate) { // 如果有上上次的fiber，就进行复用
                newFiber = foundFiber.alternate;
                newFiber.props = newChild.props;
                // alternate还是指向上一个fiber，这样foundFiber和它的alternate fiber各自的alternate指向彼此
                newFiber.alternate = foundFiber; 
                newFiber.effectTag = UPDATE;
                newFiber.nextEffect = null;
            } else {
                newFiber = {
                    tag: foundFiber.tag,
                    type: foundFiber.type,
                    key: foundFiber.key,
                    props: newChild.props,
                    stateNode: foundFiber.stateNode,
                    return: currentFiber,
                    alternate: foundFiber, // 新fiber alternate指向老fiber
                    effectTag: UPDATE,
                    nextEffect: null, //下一个Fiber执行单元
                };
            }
            if (foundFiber._mountIndex < lastIndex) { // 小于表示需要移动，添加toIndex
                newFiber.toIndex = newChildIndex;
            } else { // 大于或等于表示不需要移动，此时更新lastIndex, 并删除toIndex避免之前toIndex影响而插入到错误的位置
                lastIndex = foundFiber._mountIndex;
                newFiber.hasOwnProperty('toIndex') && delete newFiber.toIndex;
            }
        } else if (newChild) {
            newFiber = {
                tag,
                type: newChild.type,
                key: newChild.key,
                props: newChild.props,
                stateNode: null,
                toIndex: newChildIndex,
                return: currentFiber,
                effectTag: PLACEMENT,
                nextEffect: null, //下一个Fiber执行单元
            };
        }
        delete oldFiberMap[newKey];
        if (newFiber) {
            if (!currentFiber.child)
                currentFiber.child = newFiber;
            else {
                prevSibling.sibling = newFiber;
            }
            prevSibling = newFiber;
        }
        ++newChildIndex;
    }
    prevSibling.sibling && delete prevSibling.sibling; // 删除复用的最后一个旧Fiber(foundFiber)的sibling节点，否则下次通过getOldFiberMap获取的旧fiber map将失真。
    for (const key in oldFiberMap) {
        oldFiberMap[key].effectTag = DELETE;
        deletions.push(oldFiberMap[key]);
    }
}
// 循环执行工作 nextUnitOfWork
function workLoop(deadLine) {
    let shouldYield = false; // 是否要让出时间片或控制权
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
        shouldYield = deadLine.timeRemaining() < 1;
    }
    // 不管有没有任务，都要求再次调度，每一帧都要执行依次workLoop
    if (!nextUnitOfWork && workInProgressRoot) {
        console.log('render阶段结束');
        commitRoot();
    }
    requestIdleCallback(workLoop, {
        timeout: 500
    });
}

function commitRoot() {
    deletions.forEach(commitWork); // 先执行节点删除effect
    deletions.length = 0;
    let currentFiber = workInProgressRoot.firstEffect;
    while (currentFiber) {
        commitWork(currentFiber);
        currentFiber = currentFiber.nextEffect;
    }
    currentRoot = workInProgressRoot; // 把渲染成功的根fiber 赋值给currentRoot
    workInProgressRoot = null;
}

function commitWork(currentFiber) {
    if (!currentFiber) return;
    let returnFiber = currentFiber.return;
    while (returnFiber.tag === TAG_CLASS ||
        returnFiber.tag === TAG_FUNCTION) { // 如果父Fiber的tag为TAG_CLASS或TAG_FUNCTION，那么其stateNode就不是DOM，此时需要继续往上找到真实的父级DOM
        returnFiber = returnFiber.return;
    }
    const returnDOM = returnFiber.stateNode;
    if (currentFiber.tag === TAG_CLASS ||
        currentFiber.tag === TAG_FUNCTION) // commitWork用于处理DOM副作用，如果当前是组件的fiber，则不处理
        return;
    const {
        stateNode,
        toIndex,
        effectTag,
        tag,
        alternate,
        props,
    } = currentFiber;
    if (effectTag === PLACEMENT) {
        returnDOM.appendChild(stateNode);
    } else if (effectTag === DELETE) {
        returnDOM.removeChild(stateNode);
    } else if (effectTag === UPDATE) {
        if (tag === TAG_TEXT) {
            if (alternate.props.children !== props.children)
                stateNode.textContent = props.children;
        } else {
            patchProps(stateNode, alternate.props, props);
        }
        if (toIndex) { // 存在toIndex表示需要移动
            returnDOM.removeChild(stateNode);
            insertChildAt(returnDOM, stateNode, toIndex);
        }
    }
    currentFiber.effectTag = null;
}

function insertChildAt(parentNode, childDOM, toIndex) {
    const oldChild = parentNode.children[toIndex]; // 先取出这个位置旧的DOM节点
    oldChild ? parentNode.insertBefore(childDOM, oldChild) : parentNode.appendChild(childDOM);
}

export function useReducer(reducer, initialValue) {
    let nextHook;
    const {
        alternate
    } = workInProgressFunction;
    alternate && ({
        hooks: {
            [hookIndex]: nextHook
        }
    } = alternate);
    if (!nextHook) {
        nextHook = {
            state: initialValue,
        }
    }
    const dispatch = action => {
        updateQueue.enqueueUpdate(
            typeof reducer === 'function' ? reducer(nextHook.state, action) : action,
            null, nextHook
        )
        scheduleRoot();
    }
    workInProgressFunction.hooks[hookIndex++] = nextHook;
    return [nextHook.state, dispatch];
}
export function useState(initialValue) {
    return useReducer(null, initialValue);
}
// react告诉浏览器有任务需要在其空闲时执行
// 这里React内部有一个优先级的概念——expirationTime
requestIdleCallback(workLoop, {
    timeout: 500
});