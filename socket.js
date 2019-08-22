/*
 * socket.js - 동적 JS 로딩 예제
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
  setWatch,

  http = require('http'),
  express = require('express'),
  socketIo = require('socket.io'),
  fsHandle = require('fs'),

  app = express(),
  server = http.createServer(app),
  io = socketIo.listen(server),
  watchMap = {}
;
// ------------ 모듈 스코프 변수 끝 ------------

// ------------ 유틸리티 메서드 시작 ------------
setWatch = function (url_path, file_type) {
  console.log('setWatch called on ' + url_path);
  if (!watchMap[url_path]) {
    console.log('setting watch on ' + url_path);

    fsHandle.watchFile(
      url_path.split('?')[0].slice(1),
      function (current, previous) {
        console.log('previous ', previous);
        console.log('current ', current);
        console.log('file accessed');
        if (current.mtime !== previous.mtime) {
          console.log('file changed');
          io.sockets.emit(file_type, url_path);
        }
      }
    );
    watchMap[url_path] = true;
  }
};
// ------------ 유틸리티 메서드 끝 ------------

// ------------ 서버 설정 시작 ------------
app.configure(function() {
  app.use(function (request, response, next) {
    console.log(request.url);
    if (request.url.indexOf('/js/') >= 0) {
      setWatch(request.url, 'script');
    } else if (request.url.indexOf('/css/') >= 0) {
      setWatch(request.url, 'stylesheet');
    }
    next();
  });
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
// ------------ 서버 구동 끝 ------------
