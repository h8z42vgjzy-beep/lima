import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyMove, visibleState } from './games.mjs';

test('Tic-Tac-Toe: legal moves, occupied fields, win and draw', () => {
  let state=initialState('tic-tac-toe'), result;
  for (const [i,cell] of [0,3,1,4,2].entries()) { result=applyMove('tic-tac-toe',state,i%2+1,{cell});state=result.state; }
  assert.equal(result.won,true);assert.equal(result.draw,false);
  assert.throws(()=>applyMove('tic-tac-toe',state,2,{cell:0}));
  assert.throws(()=>applyMove('tic-tac-toe',state,2,{cell:-1}));
  state=initialState('tic-tac-toe');
  for(const [i,cell] of [0,1,2,4,3,5,7,6,8].entries()){result=applyMove('tic-tac-toe',state,i%2+1,{cell});state=result.state;}
  assert.equal(result.draw,true);assert.equal(result.won,false);
});

test('Connect four: gravity, full columns, horizontal/vertical/diagonal wins', () => {
  let state=initialState('connect-four'),result;
  for(const [i,column] of [0,1,0,1,0,1,0].entries()){result=applyMove('connect-four',state,i%2+1,{column});state=result.state;}
  assert.equal(result.won,true);
  for(const indexes of [[35,36,37],[35,29,23],[14,22,30]]){
    state=initialState('connect-four');indexes.forEach(i=>state.board[i]=1);
    if(indexes[0]===35&&indexes[1]===36)result=applyMove('connect-four',state,1,{column:3});
    else if(indexes[0]===35){[24,31,38].forEach(i=>state.board[i]=2);result=applyMove('connect-four',state,1,{column:3});}
    else result=applyMove('connect-four',state,1,{column:3});
    assert.equal(result.won,true);
  }
  state=initialState('connect-four');for(let i=0;i<6;i++)state=applyMove('connect-four',state,i%2+1,{column:0}).state;
  assert.throws(()=>applyMove('connect-four',state,1,{column:0}));
});

test('Number duel: hidden answer, free hints, bounded guesses and success',()=>{
  let state={secret:42,low:1,high:100,guesses:[]};
  assert.equal(visibleState('number-duel',state).secret,undefined);
  state=applyMove('number-duel',state,1,{guess:20}).state;assert.equal(state.low,21);
  state=applyMove('number-duel',state,2,{guess:70}).state;assert.equal(state.high,69);
  assert.throws(()=>applyMove('number-duel',state,1,{guess:12}));
  const final=applyMove('number-duel',state,1,{guess:42});assert.equal(final.won,true);
  assert.equal(visibleState('number-duel',final.state,true).answer,42);
});
