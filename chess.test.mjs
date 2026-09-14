import test from 'node:test';
import assert from 'node:assert/strict';
import { initialChessState, applyChessMove } from './chess.mjs';

test('Chess: legal turns, illegal moves and Fool’s Mate are server-authoritative',()=>{
  let state=initialChessState(),result;
  assert.throws(()=>applyChessMove(state,1,{from:52,to:20}));
  for(const [side,from,to] of [[1,53,45],[2,12,28],[1,54,38],[2,3,39]]){
    result=applyChessMove(state,side,{from,to});state=result.state;
  }
  assert.equal(result.won,true);assert.equal(result.draw,false);assert.equal(state.check,true);
  assert.equal(initialChessState().board[53],'P','original setup is not mutated');
});

test('Chess: castling, en passant and automatic queen promotion work',()=>{
  let state={...initialChessState(),board:Array(64).fill(null),castling:'K',enPassant:null};
  state.board[60]='K';state.board[63]='R';state.board[4]='k';
  let moved=applyChessMove(state,1,{from:60,to:62}).state;
  assert.equal(moved.board[62],'K');assert.equal(moved.board[61],'R');assert.equal(moved.castling,'');

  state={...initialChessState(),board:Array(64).fill(null),castling:'',enPassant:null};
  state.board[60]='K';state.board[4]='k';state.board[28]='P';state.board[11]='p';
  moved=applyChessMove(state,2,{from:11,to:27}).state;assert.equal(moved.enPassant,19);
  moved=applyChessMove(moved,1,{from:28,to:19}).state;assert.equal(moved.board[19],'P');assert.equal(moved.board[27],null);

  state={...initialChessState(),board:Array(64).fill(null),castling:'',enPassant:null};
  state.board[60]='K';state.board[7]='k';state.board[8]='P';
  moved=applyChessMove(state,1,{from:8,to:0}).state;assert.equal(moved.board[0],'Q');
});

test('Chess: stalemate is recognized as a draw',()=>{
  const state={...initialChessState(),board:Array(64).fill(null),castling:'',enPassant:null};
  state.board[0]='k';state.board[18]='K';state.board[17]='Q';
  const result=applyChessMove(state,1,{from:17,to:10});
  assert.equal(result.won,false);assert.equal(result.draw,true);assert.equal(result.state.check,false);
});
