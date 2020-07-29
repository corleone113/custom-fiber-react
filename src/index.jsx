import React from './react';
import ReactDOM from './react-dom';
import Counter from './Counter';

const style = { border: '3px solid indianred', margin: '5px', }
const element = (
  <div id='A1' style={style}>
    {null}A1
    <div id='B1' style={style}>
      B1
      <div id='C1' style={style}>C1</div>
      <div id='C2' style={style}>C2</div>
    </div>
    <div id='B2' style={style}>B2</div>
  </div>);
ReactDOM.render(<Counter />,
  document.getElementById('root')
);

console.log('element:', element, <Counter />);