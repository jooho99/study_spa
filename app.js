/*
 * app.js - 기본 인증을 지원하는 익스프레스 서버
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
  routes = require('./routes'),

  app = express(),
  server = http.createServer(app);
// ------------ 모듈 스코프 변수 끝 ------------

// ------------ 서버 설정 시작 ------------
app.configure(function () {
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname+'/public'));
  app.use(app.router);
});

app.configure('development', function() {
  app.use(express.logger());
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

app.configure('production', function() {
  app.use(express.errorHandler());
});

// 아래에 있는 모든 설정은 라우트 설정이다.
routes.configRoutes(app, server);
// ------------ 서버 설정 끝 ------------

// ------------ 서버 구동 시작 ------------
server.listen(3000);
console.log(
  'Express server listening on port %d in %s mode',
  server.address().port, app.settings.env
);
// ---------- 서버 구동 끝 ----------