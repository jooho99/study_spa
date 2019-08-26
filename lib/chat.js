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
  emitUserList, signIn, chatObj,
  socket = require('socket.io'),
  crud = require('./crud'),
  makeMongoId = crud.makeMongoId,
  chatterMap = {};
// ------------ 모듈 스코프 변수 끝 -----------

// ------------ 유틸리티 메서드 시작 -----------
// emitUserList - 모든 연결 클라이언트로 사용자 목록 브로드캐스트
//
emitUserList = function (io) {
  crud.read(
    'user',
    { is_online: true },
    {},
    function (result_list) {
      io
        .of('/chat')
        .emit('listchange', result_list);
    }
  );
};

// signIn - is_online 속성 및 chatterMap 업데이트
//
signIn = function (io, user_map, socket) {
  crud.update(
    'user',
    { '_id': user_map._id },
    { is_online: true },
    function (result_map) {
      emitUserList(io);
      user_map.is_online = true;
      socket.emit('userupdate', user_map);
    }
  );
  chatterMap[user_map._id] = socket;
  socket.user_id = user_map._id;
};
// ------------ 유틸리티 메서드 끝 -----------

// ------------ public 메서드 시작 -----------
chatObj = {
  connect : function (server) {
    var io = socket.listen(server);
    // io 설정 시작
    io
      .set('blacklist', [])
      .of('/chat')
      .on('connection', function (socket) {
        // /adduser/ 메시지 핸들러 시작
        // 요약: 로그인 기능 제공
        // 인자: 단일 user_map 객체
        //  user_map은 다음 속성이 있어야 한다.
        //    name = 사용자 이름
        //    cid = 클라이언트 id
        // 행동:
        //  인자로 받은 사용자명에 해당하는 사용자가 몽고디비에 이미 존재하면
        //    기존 사용자 객체를 사용하고
        //    다른 입력 값은 무시한다.
        //  사용자명에 해당하는 사용자가 몽고디비에 존재하지 않으면
        //    사용자를 생성하고 사용한다.
        //  로그인 절차가 완료되게끔
        //    'userupdate' 메시지를 전송자에게 본낸다.
        //    이때 클라이언트가 사용자를 알 수 있게
        //    클라이언트 id를 다시 전송하지만
        //    이를 몽고디비에 저정하지는 않는다.
        //  사용자를 온라인으로 표시하고 업데이트된 온라인 사용자 목록을
        //    모든 클라이언트('adduser' 메시지를 보내 클라이언트 포함)로 보낸다.
        socket.on('adduser', function (user_map) {
          crud.read(
            'user',
            { name : user_map.name },
            {},
            function (result_list) {
              var
                result_map,
                cid = user_map.cid;
              delete user_map.cid;

              // 사용자명에 해당하는 기존 사용자 사용
              if (result_list.length > 0 ) {
                result_map = result_list[0];
                result_map.cid = cid;
                signIn(io, result_map, socket);
              }
              // 새 이름으로 사용자 생성
              else {
                user_map.is_online = true;
                crud.construct(
                  'user',
                  user_map,
                  function (result_list) {
                    result_map = result_list[0];
                    result_map.cid = cid;
                    chatterMap[result_map._id] = socket;
                    socket.user_id = result_map._id;
                    socket.emit('userupdate', result_map);
                    emitUserList(io);
                  }
                );
              }
            }
          );
        });
        // /adduser/ 메시지 핸들러 끝

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