/*
 * socket.js - 간단한 socket.io 예제
 */

/*jslint         node    : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/
/*global */

// ------------ 모듈 스코프 변수 시작 ------------
'use strict';
var
  countUp,

  http = require('http'),
  express = require('express'),
  socketIo = require('socket.io'),

  app = express(),
  server = http.createServer(app),
  countIdx = 0
;
// ------------ 모듈 스코프 변수 끝 ------------

// ------------ 유틸리티 메서드 시작 ------------
countUp = function () {
  countIdx++;
  console.log(countIdx);
};
// ------------ 유틸리티 메서드 끝 ------------

// ------------ 서버 설정 시작 ------------
app.configure(function() {
  app.use(express.static(__dirname + '/'));
});

app.get('/', function(request, response){
  response.redirect('/socket.html');
});
// ------------ 서버 설정 끝 ------------

// ------------ 서버 구동 시작 ------------
server.listen(3000);
console.log(
  'Express server listening on port %d in %s mode',
  server.address().port, app.settings.env
);

setInterval(countUp, 1000);
// ------------ 서버 구동 끝 ------------
