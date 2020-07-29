export const TEXT = Symbol.for('text'); // 作为$$typeof的值，表示文本节点React元素
export const REACT_ELEMENT = Symbol.for('react.element'); // 作为$$typeof的值，表示HTML元素React元素
export const CLASS_COMPONENT = Symbol.for('component.class'); // 作为$$typeof的值，表示类组件React元素
export const FUNCTION_COMPONENT = Symbol.for('component.function'); // 作为$$typeof的值，表示函数组件React元素
export const TAG_ROOT = Symbol.for('tag.root'); // 作为fiber.tag的值，表示root fiber;
export const TAG_HOST = Symbol.for('tag.host'); // 作为fiber.tag的值，表示宿主节点fiber;
export const TAG_TEXT = Symbol.for('tag.text'); // 作为fiber.tag的值，表示文本节点fiber;
export const TAG_CLASS= Symbol.for('tag.class'); // 作为fiber.tag的值，表示类组件fiber;
export const TAG_FUNCTION = Symbol.for('tag.function'); // 作为fiber.tag的值，表示函数组件fiber;

export const PLACEMENT = Symbol.for('placement');
export const UPDATE = Symbol.for('update');
export const DELETE = Symbol.for('delete');