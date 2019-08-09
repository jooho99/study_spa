/*
 * spa.model.js
 * 모델 모듈
 */

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global TAFFY, $, spa */

spa.model = (function () {
  'use strict';
  var
    configMap = {anon_id: 'a0'},
    stateMap = {
      anon_user: null,
      cid_serial: 0,
      is_connected: false,
      people_cid_map: {},
      people_db: TAFFY(),
      user: null
    },

    isFakeData = true,

    personProto, makeCid, clearPeopleDb, completeLogin,
    makePerson, removePerson, people, chat, initModule;

  // people 객체 API
  // --------------------------
  // people 객체는 spa.model.people에서 사용할 수 있다.
  // people 객체는 사람 객체 컬렉션을 관리하기 위한 메서드 및 이벤트를 제공한다.
  // 이 객체의 공개 메서드는 다음과 같다.
  //  * get_user() - 현재 사용자 사람 객체를 반환. 현재 사용자가 로그인돼 있지 않으면
  //    익명 사람 객체를 반환.
  //  * get_db() - 미리 정렬된 모든 사람 객체(현재 사용자 포함)가 있는
  //    TaffyDB 데이터베이스를 반환
  //  * get_by_cid(<client_id>) - 인자로 전달받은 고유 id에 해당하는 사람 객체를 반환
  //  * login(<user_name>) - 인자로 받은 사용자명을 사용해 사용자로 로그인.
  //    이때 새 신원을 반영하기 위해 현재 사용자 객체가 변경된다.
  //  * logout() - 현재 사용자 객체를 익명으로 되돌림.
  //
  // people 객체에서 발행하는 제이쿼리 전역 커스텀 이벤트는 다음과 같다.
  //  * 'spa-login'은 사용자 로그인 절차가 완료될 때 발행된다.
  //    이때 업데이트된 사용자 객체가 데이터로 제공된다.
  //  * 'spa-logout'는 로그아웃 절차가 완료될 때 발행된다.
  //    이때 이전 사용자 객체가 데이터로 제공된다.
  //
  // 각 사람은 Person 객체로 표현한다.
  // Person 객체는 다음 메서드를 제공한다.
  //  * get_is_user() - 객체가 현재 사용자이면 true를 반환
  //  * get_is_anon() - 객체가 익면 사용자이면 true를 반환
  //
  // Person 객체의 속성은 다음과 같다.
  //  * cid - 문자열 클라이언트 id. 이 id는 항상 정의되며, 클라이언트 데이터가 백엔드와 동기화되지
  //    않은 경우에만 id와 일치하지 않는다.
  //  * id - 고유 id. 객체가 백엔드와 동기화되지 않았다면 정의돼 있지 않을 수 있다.
  //  * name - 사용자의 문자열 이름
  //  * css_map - 아바타 표현에 사용되는 속성 맵
  personProto = {
    get_is_user: function () {
      return this.cid === stateMap.user.cid;
    },
    get_is_anon: function () {
      return this.cid === stateMap.anon_user.cid;
    }
  };

  makeCid = function () {
    return 'c' + String( stateMap.cid_serial++);
  };

  clearPeopleDb = function () {
    var user = stateMap.user;
    stateMap.people_db = TAFFY();
    stateMap.people_cid_map = {};
    if (user) {
      stateMap.people_db.insert(user);
      stateMap.people_cid_map[user.cid] = user;
    }
  };

  completeLogin = function (user_list) {
    var user_map = user_list[0];
    delete stateMap.people_cid_map[user_map.cid];
    stateMap.user.cid = user_map._id;
    stateMap.user.id = user_map._id;
    stateMap.user.css_map = user_map.css_map;
    stateMap.people_cid_map[user_map._id] = stateMap.user;

    chat.join();
    $.gevent.publish('spa-login', [stateMap.user]);
  };

  makePerson = function (person_map) {
    var person,
      cid = person_map.cid,
      css_map = person_map.css_map,
      id = person_map.id,
      name = person_map.name;

    if (cid === undefined || !name) {
      throw 'client id and name required';
    }

    person = Object.create(personProto);
    person.cid = cid;
    person.name = name;
    person.css_map = css_map;

    if (id) { person.id = id; }

    stateMap.people_cid_map[cid] = person;

    stateMap.people_db.insert(person);
    return person;
  };

  removePerson = function (person) {
    if (!person) { return false; }
    // 익명인 사람은 제거할 수 없다
    if (person.id === configMap.anon_id) {
      return false;
    }

    stateMap.people_db({cid: person.cid}).remove();
    if (person.cid) {
      delete stateMap.people_cid_map[person.cid];
    }
    return true;
  };

  people = (function () {
    var get_by_cid, get_db, get_user, login, logout;

    get_by_cid = function (cid) {
      return stateMap.people_cid_map[cid];
    };

    get_db = function () { return stateMap.people_db; };

    get_user = function () { return stateMap.user; };

    login = function (name) {
      var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();

      stateMap.user = makePerson({
        cid: makeCid(),
        css_map: {top: 25, left: 25, 'background-color': '#8f8'},
        name: name
      });

      sio.on('userupdate', completeLogin);

      sio.emit('adduser', {
        cid: stateMap.user.cid,
        css_map: stateMap.user.css_map,
        name: stateMap.user.name
      });
    };

    logout = function () {
      var user = stateMap.user;

      chat._leave();
      stateMap.user = stateMap.anon_user;
      clearPeopleDb();

      $.gevent.publish('spa-logout', [user]);
    };

    return {
      get_by_cid: get_by_cid,
      get_db: get_db,
      get_user: get_user,
      login: login,
      logout: logout
    };
  }());

  // chat 객체 API
  // --------------------------
  // chat 객체는 spa.model.chat에서 사용할 수 있다.
  // chat 객체는 채팅 메시지를 관리하기 위한 메서드 및  이벤트를 제공한다.
  // chat 객체의 public 메서드는 다음과 같다.
  //   * join() - 채팅방에 참여한다. 이 루틴에서는
  //     'spa-listchange' 및 'spa-updatechat' 전역 커스텀 이벤트의 발행지를 비롯해
  //     백엔드와의 채팅 프로토콜을 설정한다.
  //     현재 사용자가 익명이면
  //     join()은 작업은 중단하고 false를 반환한다.
  //   * get_chatee() - 사용자가 채팅 중인
  //     Person 객체를 반환한다. 채팅 상대가 없으면 null을 반환한다.
  //   * set_chatee(<person_id>) - 채팅 상대를
  //     person_id로 식별한 사람으로 설정한다.
  //     person_id가 사람들 목록에 존재하지 않으면
  //     채팅 상대(chatee)는 null로 설정된다.
  //     요청한 채팅 상대와 이미 채팅 중이면 false를 반환한다.
  //     이 메서드는 'spa-setchatee' 전역 커스텀 이벤트를 발송한다.
  //   * send_msg(<msg_text>) - 채팅 상대에게 메시지를 발송한다.
  //     이 메서드는 'spa-updatechat' 전역 커스텀 이벤트를 발송한다.
  //     사용자가 익명이거나 채팅 상대가 null이면
  //     작업을 중단하고 false를 반환한다.
  //   * update_avatar(<update_avtr_map>) - update_avtr_map을
  //     백엔드로 전송한다. 이렇게 하면 'spa-listchange' 이벤트가 일어나고,
  //     업데이트된 사람들 목록 및 아바타 정보(Person 객체에 있는 css_map)가 전달된다.
  //     update_avtr_map은 반드시
  //     { person_id : person_id, css_map : css_map } 형식이어야 한다.
  //
  // chat 객체에서 발송하는 전역 커스텀 이벤트는 다음과 같다.
  //   * spa-setchatee - 새 채팅 상대를 설정할 때 발송된다.
  //       { old_chatee : <old_chatee_person_object>,
  //         new_chatee : <new_chatee_person_object>
  //       }
  //     형식의 맵을 데이터로 제공한다.
  //   * spa-listchange - 온라인 상태의 사람 목록의 길이가
  //     바뀌거나(즉, 사람이 채팅에 참여하거나 채팅방에서 나갈 때)
  //     내용이 바뀔 때(즉, 사람의 아바타 상세 정보가 변경될 때) 발송된다.
  //     이 이벤트를 구독하는 구독자는 업데이트된 데이터에 대해
  //     people 모델로부터 people_db를 가져와야 한다.
  //   * spa-updatechat - 새 메시지를 수신하거나 전송할 때 발송된다.
  //       { dest_id : <chatee_id>,
  //         dest_name : <chatee_name>,
  //         sender_id : <sender_id>,
  //         msg_text: <message_content>
  //        }
  //     형식의 맵을 데이터로 제공한다.
  //
  chat = (function () {
    var
      _publish_listchange, _publish_updatechat,
      _update_list, _leave_chat,
      get_chatee, join_chat, send_msg,
      set_chatee, update_avatar,
      chatee = null;

    // 내부 메서드 시작
    _update_list = function (arg_list) {
      var i, person_map, make_person_map, person,
        people_list = arg_list[0],
        is_chatee_online = false;

      clearPeopleDb();

      PERSON:
      for (i = 0; i < people_list.length; i++) {
        person_map = people_list[i];

        if (!person_map.name) { continue PERSON; }

        // 사용자가 정의돼 있으면 css_map을 업데이트하고 나머지 코드를 건너뜀
        if (stateMap.user && stateMap.user.id === person_map._id) {
          stateMap.user.css_map = person_map.css_map;
          continue PERSON;
        }

        make_person_map = {
          cid: person_map._id,
          css_map: person_map.css_map,
          id: person_map._id,
          name: person_map.name
        };
        person = makePerson(make_person_map);
        if (chatee && chatee.id === make_person_map.id) {
          is_chatee_online = true;
          chatee = person;
        }
      }

      stateMap.people_db.sort('name');

      // 채팅 상대가 더는 온라인 상태가 아니면 채팅 상대 설정을 해제한다.
      // 그럼 'spa-setchatee' 전역 이벤트가 일어난다.
      if (chatee && !is_chatee_online) { set_chatee(''); }
    };

    _publish_listchange = function (arg_list) {
      _update_list(arg_list);
      $.gevent.publish('spa-listchange', [arg_list]);
    };

    _publish_updatechat = function (arg_list) {
      var msg_map = arg_list[0];

      if (!chatee) { set_chatee(msg_map.sender_id); }
      else if (msg_map.sender_id !== stateMap.user.id
        && msg_map.sender_id !== chatee.id
      ) { set_chatee(msg_map.sender_id); }

      $.gevent.publish('spa-updatechat', [msg_map]);
    };
    // 내부 메서드 끝

    _leave_chat = function () {
      var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      chatee = null;
      stateMap.is_connected = false;
      if (sio) { sio.emit('leavechat'); }
    };

    get_chatee = function() { return chatee; };

    join_chat = function () {
      var sio;

      if (stateMap.is_connected) { return false; }

      if (stateMap.user.get_is_anon()) {
        console.warn('User must be defined before joining chat');
        return false;
      }

      sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      sio.on('listchange', _publish_listchange);
      sio.on('updatechat', _publish_updatechat);
      stateMap.is_connected = true;
      return true;
    };

    send_msg = function (msg_text) {
      var msg_map,
        sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();

      if (!sio) { return false; }
      if (!(stateMap.user && chatee)) { return false; }

      msg_map = {
        dest_id: chatee.id,
        dest_name: chatee.name,
        sender_id: stateMap.user.id,
        msg_text: msg_text
      };

      // 진행 중인 메시지를 볼 수 있게 updatechat를 발행
      _publish_updatechat([msg_map]);
      sio.emit('updatechat', msg_map);
      return true;
    };

    set_chatee = function(person_id) {
      var new_chatee;

      new_chatee = stateMap.people_cid_map[person_id];

      if (new_chatee) {
        if (chatee && chatee.id === new_chatee.id) {
          return false;
        }
      } else {
        new_chatee = null;
      }

      $.gevent.publish('spa-setchatee',
        {old_chatee: chatee, new_chatee: new_chatee }
      );
      chatee = new_chatee;
      return true;
    };

    // avatar_update_map은 다음 형식이어야 한다.
    // {
    //    person_id: <string>,
    //    css_map: {
    //         top: <int>, left: <int>,
    //         'background-color': <string>
    // }};
    //
    update_avatar = function(avatar_update_map) {
      var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      if (sio) {
        sio.emit('updateavatar', avatar_update_map);
      }
    };

    return {
      _leave: _leave_chat,
      get_chatee: get_chatee,
      join: join_chat,
      send_msg: send_msg,
      set_chatee: set_chatee,
      update_avatar: update_avatar
    };
  }());

  initModule = function () {
    var i, people_list, person_map;

    // 익명 사용자 초기화
    stateMap.anon_user = makePerson({
      cid: configMap.anon_id,
      id: configMap.anon_id,
      name: 'anonymous'
    });
    stateMap.user = stateMap.anon_user;
  };

  return {
    initModule: initModule,
    chat: chat,
    people: people
  };
}());
