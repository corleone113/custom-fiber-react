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
    patchProps,
    injectListener,
    flatten,
} from '../react/utils';
import {
    Updater
} from '../react/updater';
/**
 * 从根节点开始渲染和调度
 * 分为两个阶段：
 *  1. reconcile阶段——这个阶段比较费时间，所以将任务拆分为多步，这个阶段用于初始化/更新Fiber(执行顺序为先序遍历，这个过程中fiber树形成一个特殊的链表)，然后收集副作用(执行过程是后续遍历，且形成另一个链表)，这个阶段是可以中断的。
 *  2. 提交阶段，这个阶段是同步完成的，类似于回调，且不能中断，依次执行收集的副作用(树形结构，实际是链表，后续遍历)。
 */
let nextUnitOfWork = null; // 下一个fiber执行单元
let workInProgressRoot = null; // 正在渲染的根fiber
let currentRoot = null; // 渲染成功后的根fiber——上一次渲染的根fiber的缓存，实现双缓冲机制
const deletions = []; // 进行节点删除的fiber并不放在fiber链表中，而是需要单独记录并执行
let workInProgressFunction = null; // 正在工作的函数组件Fiber
let hookIndex = 0; // hook检索的索引
export function scheduleRoot(rootFiber) {
    if (currentRoot && currentRoot.alternate) { // 第三次以后(包括第三次)都是复用之前缓存的fiber，奇数次复用第一个缓存的根fiber；而偶数次复用第二个缓存的根fiber。
        workInProgressRoot = currentRoot.alternate; // 通过alternate引用一个缓存的根fiber
        rootFiber && (workInProgressRoot.props = rootFiber.props); // 更新props
        workInProgressRoot.alternate = currentRoot; // 也是通过alternate缓存另一个根fiber
    } else if (currentRoot) { // 第二次执行。生成第二个缓存的根fiber
        workInProgressRoot = {
            ...currentRoot,
            alternate: currentRoot // 这里的alternate指向第一个缓存的根fiber
        };
    } else { // 首次执行。生成第一个缓存的根fiber
        workInProgressRoot = rootFiber;
    }
    workInProgressRoot.firstEffect = workInProgressRoot.lastEffect = workInProgressRoot.nextEffect = null; // 重置Effect
    nextUnitOfWork = workInProgressRoot; // nextUnitOfWork代表当前fiber任务，它被轮询地(workLoop中)监控，只要不要null就会启动fiber任务。
}

function performUnitOfWork(currentFiber) { // 执行每个fiber任务，也是基于fiber树构建fiber链表的过程，先序遍历
    beginWork(currentFiber); // 先构建/更新父级/根 fiber
    if (currentFiber.child) { // 然后构建/更新第一个子fiber，构建/更新儿子时是从左到右进行的，child保存第一个子fiber，因为fiber实际的数据结构为链表
        return currentFiber.child;
    }
    while (currentFiber) { // 当前fiber不为null/undefined才继续
        completeUnitOfWork(currentFiber); // 遍历到嵌套层次最深的第一个子fiber就开始收集副作用(收集副作用是后序遍历)，副作用是基于fiber树形成的另一个链表(每个节点还是fiber)
        if (currentFiber.sibling) // 继续构建/更新剩余的子fiber
            return currentFiber.sibling;
        currentFiber = currentFiber.return; // 构建/更新完所有子fiber则返回父级fiber
    }
}

function completeUnitOfWork(currentFiber) { // 按照后续遍历的顺序遍历fiber收集effect(副作用)，构建(不存在更新，每次都要重新构建)出一个effect树(数据结构为链表)
    const returnFiber = currentFiber.return;
    if (returnFiber) { // 存在父级fiber才开始构建
        if (!returnFiber.firstEffect) { // 说明currentFiber是returnFiber第一个儿子，不过因为是后序遍历所以优先处理currentFiber儿子的副作用
            returnFiber.firstEffect = currentFiber.firstEffect;
        }
        if (currentFiber.lastEffect) { // 说明currentFiber的儿子确实有副作用——lastEffect存在则firstEffect一定存在。因为lastEffect总是要指向最后一个有效的effect上，所以这里需要进行判断。
            if (returnFiber.lastEffect) { // 说明currentFiber不是returnFiber第一个儿子，所以它儿子们的副作用要排到后面去
                returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
            }
            returnFiber.lastEffect = currentFiber.lastEffect; // 将lastEffect指向正确的位置——指向currentFiber最后一个子/孙fiber的副作用
        }
        const effectTag = currentFiber.effectTag;
        if (effectTag) { // currentFiber自己有副作用则在儿子的副作用之后处理
            if (returnFiber.lastEffect) { // 说明currentFiber不是第一个儿子，所以它的副作用要排在后面
                returnFiber.lastEffect.nextEffect = currentFiber; // 副作用仍然是fiber节点
            } else {
                returnFiber.firstEffect = currentFiber; // 说明currentFiber是第一个儿子，且它的子Fiber没有副作用或没有子fiber。
            }
            returnFiber.lastEffect = currentFiber; // 将lastEffect指向正确的位置
        }
    }
}
// beginWork对应reconcile阶段
function beginWork(currentFiber) {
    if (currentFiber.tag === TAG_ROOT) {
        updateHostRoot(currentFiber); // 创建/更新根fiber
    } else if (currentFiber.tag === TAG_TEXT) {
        updateHostText(currentFiber); // 创建/更新文本节点fiber
    } else if (currentFiber.tag === TAG_HOST) {
        updateHost(currentFiber); // 创建/更新宿主节点(html元素)fiber
    } else if (currentFiber.tag === TAG_CLASS) {
        updateClassComponent(currentFiber); // 创建/更新类组件fiber
    } else if (currentFiber.tag === TAG_FUNCTION) {
        updateFunctionComponent(currentFiber); // 创建/更新函数组件fiber
    }
}

function updateFunctionComponent(currentFiber) {
    workInProgressFunction = currentFiber; // 当前函数组件fiber作为workInProgressFunction(处理hooks)
    hookIndex = 0; // hook索引重置为0
    workInProgressFunction.hooks = []; // 重置hook数组
    workInProgressFunction.hookUpdaters = []; // 重置updater数组(和每个hook对应)
    const newElement = currentFiber.type(currentFiber.props); // 重新渲染
    reconcileChildren(currentFiber, flatten([newElement])); // 生成/更新子fiber
}

function updateHost(currentFiber) {
    if (!currentFiber.stateNode) { // stateNode不存在则创建对应的元素DOM节点
        currentFiber.stateNode = createDOM(currentFiber);
    }
    const newChildren = currentFiber.props.children;
    reconcileChildren(currentFiber, newChildren); // 构建/更新子fiber
}

function createDOM(currentFiber) { // 创建并返回DOM节点
    if (currentFiber.tag === TAG_TEXT) { // 对于文本节点fiber则返回文本节点
        return document.createTextNode(currentFiber.props.children);
    } else if (currentFiber.tag === TAG_HOST) { // 对于宿主节点fiber则返回DOM元素节点
        const stateNode = document.createElement(currentFiber.type);
        patchProps(stateNode, {}, currentFiber.props); // 添加/更新/删除 attribute。
        return stateNode;
    }
}

function updateHostText(currentFiber) {
    if (!currentFiber.stateNode) { // stateNode不存在则创建文本节点
        currentFiber.stateNode = createDOM(currentFiber);
    }
}

function updateClassComponent(currentFiber) {
    if (!currentFiber.stateNode) { // 类组件stateNode为其组件实例
        const instance = new currentFiber.type(currentFiber.props);
        currentFiber.updater = instance.updater; // 取组件实例的updater作为fiber的updater
        if (currentFiber.updaters) currentFiber.updaters.push(instance.updater); // 存在父级fiber传递过来的updaters则将当前fiber的updater放置在末尾
        else currentFiber.updaters = [instance.updater]; // 否则创建新的updaters
        currentFiber.stateNode = instance;
    }
    currentFiber.stateNode.props = currentFiber.props; // 更新组件实例的props(props从React元素传递到fiber到传到组件实例中)
    // 给组件实例的state赋值
    const newElement = currentFiber.stateNode.render(); // 重新渲染
    reconcileChildren(currentFiber, flatten([newElement]));
}

function updateHostRoot(currentFiber) { // 构建/更新根fiber
    const newChildren = currentFiber.props.children;
    reconcileChildren(currentFiber, newChildren); // 构建/更新子fiber
}

function getOldFiberMap(oldFiber) { // 生成旧子Fiber的map，key到fiber的映射表
    let i = 0; // 作为遍历时的索引
    const map = {};
    let nextFiber = oldFiber; // 表示当前遍历的子fiber
    while (nextFiber) {
        const key = nextFiber.key || i.toString(); // 优先使用key作为键
        map[key] = nextFiber;
        ++i;
        nextFiber = nextFiber.sibling; // 将nextFiber指向下一个fiber——遍历下一个子fiber
    }
    return map;
}

function reconcileChildren(currentFiber, newChildren) { // 遍历子React元素数组来构建/更新子fiber
    const {
        updaters, // updaters保存当前fiber的updater(和类组件实例或hook对应)
    } = currentFiber;
    let oldFiber = currentFiber.alternate && currentFiber.alternate.child; // 尝试获取旧的第一个子fiber
    oldFiber && (oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null); // 重置副作用
    let prevSibling; // 表示上一个兄弟fiber
    let newFiber; // 表示当前的生成/更新的子fiber
    currentFiber.child = null; // 清除之前的子fiber(对非初次渲染)
    const oldFiberMap = getOldFiberMap(oldFiber); // 获取key到旧子fiber的映射表
    let newChildIndex = 0; // 遍历的索引
    let lastIndex = 0; // 比对新旧子fiber时当前不需要移动的子DOM节点的最近一个索引
    while (newChildIndex < newChildren.length) { // 遍历children
        let tag;
        const newChild = newChildren[newChildIndex]; // 当前遍历的子节点
        updaters && injectListener(updaters, newChild.props); // 填充事件监听器到updaters的映射表(用的WeakMap)
        const newKey = (newChild && newChild.key) || newChildIndex.toString(); // 优先使用React元素上的key prop，非React元素或不含key prop则使用数字索引
        let foundFiber = oldFiberMap[newKey] || {}; // 查找可复用的旧子fiber
        if (foundFiber.type !== newChild.type) { // 类型不同不会复用
            foundFiber = null;
        }
        if (newChild && newChild.$$typeof === TEXT) { // 确定tag(fiber)类型
            tag = TAG_TEXT;
        } else if (newChild && newChild.$$typeof === REACT_ELEMENT) {
            tag = TAG_HOST;
        } else if (newChild && newChild.$$typeof === CLASS_COMPONENT) {
            tag = TAG_CLASS;
        } else if (newChild && newChild.$$typeof === FUNCTION_COMPONENT) {
            tag = TAG_FUNCTION;
        }
        if (foundFiber) {
            if (foundFiber.alternate) { // 第三次以之后的渲染才能在可复用的fiber的alternate上找到缓存的fiber
                newFiber = foundFiber.alternate; // 复用缓存的fiber
                newFiber.props = newChild.props; // 更新props
                // alternate还是指向上一个fiber，这样foundFiber和它的alternate fiber各自的alternate指向彼此
                newFiber.alternate = foundFiber; // 保存当前缓存的fiber
                newFiber.effectTag = UPDATE; // 副作用类型为更新(包含移动)
                newFiber.nextEffect = null; // 重置effect
            } else { // 第二次渲染才找得到可复用的fiber
                newFiber = { // 第二次渲染也需要生成新的fiber(作为该fiber的第二个缓存)
                    tag: foundFiber.tag,
                    type: foundFiber.type,
                    key: foundFiber.key,
                    props: newChild.props, // 更新props
                    stateNode: foundFiber.stateNode,
                    return: currentFiber, // 父级fiber
                    alternate: foundFiber, // 新fiber alternate指向老fiber
                    effectTag: UPDATE, // 副作用类型为更新
                    nextEffect: null, //下一个副作用
                };
                foundFiber.updater && (newFiber.updater = foundFiber.updater); // 复用updater
                foundFiber.updaters && (newFiber.updaters = foundFiber.updaters); // 复用updaters
            }
            if (foundFiber._mountIndex < lastIndex) { // 小于表示需要移动，添加toIndex
                newFiber.toIndex = newChildIndex;
            } else { // 大于或等于表示不需要移动，此时更新lastIndex, 并删除toIndex避免之前toIndex影响而插入到错误的位置
                lastIndex = foundFiber._mountIndex;
                newFiber.hasOwnProperty('toIndex') && delete newFiber.toIndex;
            }
        } else if (newChild) { // 首次渲染，则找不到可复用的，或对应位置旧fiber被删除
            newFiber = {
                tag,
                type: newChild.type,
                key: newChild.key,
                props: newChild.props,
                stateNode: null,
                toIndex: newChildIndex,
                return: currentFiber,
                effectTag: PLACEMENT, // 副作用类型为新增
                nextEffect: null, //下一个副作用
            };
            updaters && (newFiber.updaters = updaters.slice()); // 父级fiber存在updaters则将其传递给当前子fiber
        }
        delete oldFiberMap[newKey]; // 删除映射表中被复用的fiber
        if (newFiber) {
            if (!currentFiber.child)
                currentFiber.child = newFiber; // 保存child——第一个子fiber
            else {
                prevSibling.sibling = newFiber; // 不是第一个子fiber则作为上一个子fiber的兄弟fiber保存
            }
            prevSibling = newFiber; // prevSibling保存当前子fiber，作为下一个子fiber的兄弟fiber
            newFiber._mountIndex = newChildIndex; // 最后始终要更新_mountIndex，_mountIndex用于diff比对时使用
        }
        ++newChildIndex;
    }
    prevSibling.sibling && delete prevSibling.sibling; // 删除复用的最后一个旧Fiber(foundFiber)的sibling节点，否则下次通过getOldFiberMap获取的旧fiber map将失真。
    for (const key in oldFiberMap) { // 未被复用的fiber的effectTag(副作用类型)都设置为DELETE(删除对应的dom节点)
        oldFiberMap[key].effectTag = DELETE;
        deletions.push(oldFiberMap[key]);
    }
}
// 循环执行工作 nextUnitOfWork
function workLoop(deadLine) {
    let shouldYield = false; // 是否要让出时间片或控制权
    while (nextUnitOfWork && !shouldYield) { // nextUnitOfWork不为null且不需要让出时间片/控制权(即当前帧完成后还有空闲时间)则开始启动fiber任务
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // 执行当前fiber任务。
        shouldYield = deadLine.timeRemaining() < 1;
    }
    if (!nextUnitOfWork && workInProgressRoot) { // nexUnitOfWork为null(说明fiber已经初始化/更新完毕)且workInProgressRoot不为null说明可以依次执行副作用了
        commitRoot();
    }
    requestIdleCallback(workLoop, { // 通过requestIdleCallback递归调用workLoop方法从而轮询地监控nextUnitOfWork变化——只要它不为null就启动fiber任务。
        timeout: 500
    });
}

function commitRoot() {
    deletions.forEach(commitWork); // 先执行节点删除effect
    deletions.length = 0;
    let currentFiber = workInProgressRoot.firstEffect;
    while (currentFiber) { // 然后执行新增/更新effect
        commitWork(currentFiber);
        currentFiber = currentFiber.nextEffect;
    }
    currentRoot = workInProgressRoot; // 把渲染成功的根fiber 赋值给currentRoot，以缓存起来
    workInProgressRoot = null; // 重置为null——渲染结束。
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
        currentFiber.tag === TAG_FUNCTION) { // commitWork用于处理DOM副作用，如果当前是组件fiber，则不处理
        if(currentFiber.effectTag === DELETE){ // 通过删除子节点来删除组件fiber对应的React元素
            currentFiber.lastEffect.effectTag = DELETE;
            commitWork(currentFiber.lastEffect);
        }
        return;
    }
    const {
        stateNode, // fiber对应的DOM节点
        toIndex, // DOM节点移动的位置索引
        effectTag, // 副作用类型
        tag,
        alternate, // 之前的fiber
        props, // 新的props
    } = currentFiber;
    if (effectTag === PLACEMENT) {
        stateNode && returnDOM.appendChild(stateNode);
    } else if (effectTag === DELETE) {
        returnDOM.removeChild(stateNode);
    } else if (effectTag === UPDATE) {
        if (tag === TAG_TEXT) {
            if (alternate.props.children !== props.children) // 这里的children表示文本内容
                stateNode.textContent = props.children;
        } else { // 对于html元素DOM，则先更新attribute
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
    let nextHook, nextUpdater; // 分别表示当前hook、当前hook对应的updater
    const {
        alternate, // 缓存的旧的fiber
        updaters, // 保存父级fiber的updater
    } = workInProgressFunction;
    alternate && ({ // 存在缓存则从缓存中基于hookIndex取出对应的hook和updater
        hooks: {
            [hookIndex]: nextHook
        },
        hookUpdaters: {
            [hookIndex]: nextUpdater,
        }
    } = alternate);
    if (!nextHook) { // 不存在则进行初始化
        nextHook = {
            state: initialValue,
        }
    }
    if (!nextUpdater) { // 不存在则进行初始化
        nextUpdater = new Updater(nextHook);
        if (updaters) updaters.push(nextUpdater); // updaters存在则将当前updater放在其末尾。
        else workInProgressFunction.updaters = [nextUpdater]; // updaters不存在也进行初始化
    }
    const dispatch = action => {
        nextUpdater.addState(typeof reducer === 'function' ? reducer(nextHook.state, action) : action, ); // 更新state
        scheduleRoot(); // 唤起fiber任务的执行——重新渲染。
    }
    workInProgressFunction.hooks[hookIndex] = nextHook; // 初始化/更新hook
    workInProgressFunction.hookUpdaters[hookIndex] = nextUpdater; // 初始化/更新updater
    ++hookIndex;
    return [nextHook.state, dispatch];
}
export function useState(initialValue) { // 利用useReducer实现useState
    return useReducer(null, initialValue);
}
// react告诉浏览器有任务需要在其空闲时执行
// 这里React内部有一个优先级的概念——expirationTime
requestIdleCallback(workLoop, {
    timeout: 500
});