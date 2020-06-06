// import React from 'react';
// import ReactDOM from 'react-dom';
import React from './react';
import ReactDOM from './react-dom';
import Counter from './Couter';

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

// ReactDOM.render(element,
//   document.getElementById('root')
// );

console.log('element:', element, <Counter />);
// document.getElementById('render2').addEventListener('click',()=>{
//   const element = (
//     <div id='A1-new' style={style}>
//       A1-new
//       <div id='B1-new' style={style}>
//         B1-new
//         <div id='C1-new' style={style}>C1-new</div>
//         <div id='C2-new' style={style}>C2-new</div>
//       </div>
//       <div id='B2-new' style={style}>B2-new</div>
//       <div id='B3' style={style}>B3</div>
//     </div>);

//   ReactDOM.render(element,
//     document.getElementById('root')
//   );
// })
// document.getElementById('render3').addEventListener('click',()=>{
//   const element = (
//     <div id='A1-new1' style={style}>
//       A1-new1
//       <div id='B1-new1' style={style}>
//         B1-new1
//         <div id='C1-new1' style={style}>C1-new1</div>
//         <div id='C2-new1' style={style}>C2-new1</div>
//       </div>
//       <div id='B2-new1' style={style}>B2-new1</div>
//     </div>);

//   ReactDOM.render(element,
//     document.getElementById('root')
//   );
// })