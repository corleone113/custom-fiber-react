import {TAG_ROOT} from '../react/constants';
import {scheduleRoot} from '../fiber';
function render(element, container){
    const rootFiber = {
        tag: TAG_ROOT, // 每个fiber都有一个tag标识此元素的类型
        stateNode: container, // 如果这个元素是原生节点，那么startNode指向真实DOM元素
        props:{children: [element]}, // 这个fiber的props属性对象的children数组属性存放要渲染的元素
    }
    scheduleRoot(rootFiber);
}
export default {
    render,
}