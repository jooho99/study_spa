/*
 * app.js - 간단한 익스프레스 서버
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
  http = require('http'),
  express = require('express'),

  app = express(),
  server = http.createServer(app);
// ------------ 모듈 스코프 변수 끝 ------------

// ------------ 서버 설정 시작 ------------
app.get('/', function(request, response) {
  response.send('Hello Express');
});
// ------------ 서버 설정 끝 ------------

// ------------ 서버 구동 시작 ------------
server.listen(3000);
console.log(
  'Express server listening on port %d in %s mode',
  server.address().port, app.settings.env
);
// ---------- 서버 구동 끝 ----------