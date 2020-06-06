// import React, { Component, useReducer, useState,} from 'react';
import React, { Component, useReducer, useState, } from './react';
function reducer(state, action) {
    switch (action.type) {
        case 'ADD':
            return { count: state.count + 1 };
        case 'SUB':
            return { count: state.count - 1 };
        default:
            break;
    }
}
function FunctionCounter(props) {
    const [count, dispatch] = useReducer(reducer, { count: 0 });
    const [count1, setCount] = useState(0);
    return (
        <div counter={`counter${props.number}`}>
            <span>FunctionCounter number from Couter:{props.number}</span>
            <button onClick={props.add}>+</button>
            <button onClick={props.sub}>-</button>
            <div>
                <span>self count: {count.count}</span>
                <button onClick={() => dispatch({ type: 'ADD' })}>add count</button>
                <button onClick={() => dispatch({ type: 'SUB' })}>sub count</button>
            </div>
            <div>
                <span>self state count: {count1}</span>
                <button onClick={() => setCount(count1 + 1)}>add state count</button>
                <button onClick={() => setCount(count1 - 1)}>sub state count</button>
            </div>
        </div>
    )
}
class ClassCounter extends Component {
    state = { changeList: true }
    change = () => {
        this.setState((state) => {
            return { changeList: !state.changeList }
        })
    }
    render() {
        const { props, state } = this;
        return (
            <div counter={`counter${props.number}`}>
                <span>ClassCounter number from Couter:{props.number}</span>
                <button onClick={props.add}>+</button>
                <button onClick={props.sub}>-</button>
                <button onClick={this.change}>change</button>
                {state.changeList ? (
                    <ul id='fuck'>
                        <li key='a'>a</li>
                        <li key='b'>b</li>
                        <li key='c'>c</li>
                        <li key='d'>d</li>
                    </ul>
                ) : (
                        <ul id='fuck'>
                            <li key='a'>a</li>
                            <li key='c'>c</li>
                            <li key='b'>b</li>
                            <li key='d'>d</li>
                            <li key='e'>e</li>
                            <li key='f'>f</li>
                        </ul>
                    )}
            </div>
        )
    }
}
export default class Counter extends Component {
    state = { number: 0 };
    add = () => {
        this.setState({ number: this.state.number + 1 });
        console.log('>>>>', this.state);
        this.setState({ number: this.state.number + 1 }, ()=>console.log('#############', this.state));
        // this.setState(state => ({number: state.number+1}));
        console.log('>>>>', this.state);
        setTimeout(() => {
            this.setState({ number: this.state.number + 1 });
            console.log('>>>>', this.state);
        });
        setTimeout(() => {
            this.setState({ number: this.state.number + 1 });
            console.log('>>>>', this.state);
        })
    }
    sub = () => {
        // debugger;
        this.setState({ number: this.state.number - 1 })
    }
    render() {
        return (
            <div id={`counter${this.state.number}`}>
                Counter number: {this.state.number}
                <button onClick={this.add}>+</button>
                <button onClick={this.sub}>-</button>
                <FunctionCounter number={this.state.number} add={this.add} sub={this.sub} />
                <ClassCounter number={this.state.number} add={this.add} sub={this.sub} />
            </div>
            // <div id={`counter${this.state.number}`}>
            //     <FunctionCounter number={this.state.number} add={this.add} sub={this.sub} />
            // </div>
        )
    }
}