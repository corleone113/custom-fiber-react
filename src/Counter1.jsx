import React, { Component } from './react';
function FunctionCounter(props) {
    return (
        <div counter={`counter${props.number}`}>
            <p>{props.number}</p>
            <button onClick={props.add}>+</button>
            <button onClick={props.sub}>-</button>
        </div>
    )
}
class ClassCounter extends Component {
    state = { changeList: true }
    change = () => {
        this.props.add();
        this.setState((state, props) => {
            console.log('the state and props:', state, props);
            return { changeList: !state.changeList }
        })
    }
    render() {
        const { props, state } = this;
        return (
            <div counter={`counter${props.number}`}>
                <p>{props.number}</p>
                <button onClick={props.add}>+</button>
                <button onClick={props.sub}>-</button>
                <button onClick={this.change}>change</button>
                {state.changeList ? (
                    <ul>
                        <li key='a'>a</li>
                        <li key='b'>b</li>
                        <li key='c'>c</li>
                        <li key='d'>d</li>
                    </ul>
                ) : (
                        <ul>
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
export default class extends Component {
    state = { number: 0, some: 'corleone' };
    add = () => {
        this.setState({ number: this.state.number + 1 });
        console.log('>>>>', this.state);
        this.setState(state => ({ number: state.number + 1, some: state.some + state.number }), () => console.log('##############', this.state));
        console.log('^^^^', this.state);
        setTimeout(() => {
            this.setState({ number: this.state.number + 1 }); console.log('>>>>', this.state);
        });
        setTimeout(() => {
            this.setState({ number: this.state.number + 1 }); console.log('>>>>', this.state);
        })
    }
    sub = () => this.setState({ number: this.state.number - 1 })
    render() {
        return (
            <div id={`counter${this.state.number}`}>
                <p>number: {this.state.number}</p>
                <p>some: {this.state.some}</p>
                <button onClick={this.add}>+</button>
                <button onClick={this.sub}>-</button>
                <FunctionCounter number={this.state.number} add={this.add} sub={this.sub} />
                <ClassCounter number={this.state.number} add={this.add} sub={this.sub} />
            </div>
        )
    }
}