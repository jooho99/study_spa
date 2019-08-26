/*
 * chat.js - 채팅 메시지 제공 모듈
 */

/*jslint         node    : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/
/*global */
// ------------ 모듈 스코프 변수 시작 -----------
'use strict';
var
  chatObj,
  socket = require('socket.io'),
  crud = require('./crud');
// ------------ 모듈 스코프 변수 끝 -----------

// ------------ public 메서드 시작 -----------
chatObj = {
  connect : function (server) {
    var io = socket.listen(server);
    // io 설정 시작
    io
      .set('blacklist', [])
      .of('/chat')
      .on('connection', function (socket) {
        socket.on('adduser', function () {});
        socket.on('updatechat', function () {});
        socket.on('leavechat', function () {});
        socket.on('disconnect', function () {});
        socket.on('updateavatar', function () {});
      });
    // io 설정 끝
    return io;
  }
};
module.exports = chatObj;
// ------------ public 메서드 끝 -----------