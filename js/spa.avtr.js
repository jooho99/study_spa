/*
 * spa.avtr.js
 * 아바타 기능 모듈
 */

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global $, spa */

spa.avtr = (function () {
  'use strict';
  //------------------- 모듈 스코프 변수 시작 ------------------------
  var
    configMap = {
      chat_model: null,
      people_model: null,
      settable_map: {
        chat_model: true,
        people_model: true
      }
    },
    stateMap = {
      drag_map: null,
      $drag_target: null,
      drag_bg_color: undefined
    },
    jqueryMap = {},
    getRandRgb,
    setJqueryMap,
    updateAvatar,
    onTapNav,       onHeldstartNav,
    onHeldmoveNav,  onHeldendNav,
    onSetchatee,    onListchange,
    onLogout,
    configModule, initModule;

  //------------------- 모듈 스코프 변수 끝------------------------

  //------------------- 유틸리티 메서드 시작 ------------------------
  getRandRgb = function () {
    var i, rgb_list = [];
    for (i = 0; i < 3; i++) {
      rgb_list.push(Math.floor(Math.random() * 128) + 128);
    }
    return 'rgb(' + rgb_list.join(',') + ')';
  };
  //------------------- 유틸리티 메서드 끝 ------------------------

  //------------------- DOM 메서드 시작 ------------------------
  setJqueryMap = function ($container) {
    jqueryMap = {$container: $container};
  };

  updateAvatar = function ($target) {
    var css_map, person_id;

    css_map = {
      top: parseInt($target.css('top'), 10),
      left: parseInt($target.css('left'), 10),
      'background-color': $target.css('background-color')
    };
    person_id = $target.attr('data-id');

    configMap.chat_model.update_avatar({
      person_id: person_id, css_map: css_map
    });
  };
  //------------------- DOM 메서드 끝 ------------------------

  //------------------- 이벤트 핸들러 시작 ------------------------
  onTapNav = function (event) {
    var css_map,
      $target = $(event.elem_target).closest('.spa-avtr-box');
    if ($target.length === 0) { return false; }
    $target.css({'background-color' : getRandRgb()});
    updateAvatar($target);
  };

  onHeldstartNav = function (event) {
    var offset_target_map, offset_nav_map,
      $target = $(event.elem_target).closest('.spa-avtr-box');
    if ($target.length === 0) { return false; }

    stateMap.$drag_target = $target;
    offset_target_map = $target.offset();
    offset_nav_map = jqueryMap.$container.offset();

    offset_target_map.top -= offset_nav_map.top;
    offset_target_map.left -= offset_nav_map.left;

    stateMap.drag_map = offset_target_map;
    stateMap.drag_bg_color = $target.css('background-color');

    $target
      .addClass('spa-x-is-drag')
      .css('background-color','');
  };

  onHeldmoveNav = function (event) {
    var drag_map = stateMap.drag_map;
    if (!drag_map) { return false; }

    drag_map.top += event.px_delta_y;
    drag_map.left += event.px_delta_x;

    stateMap.$drag_target.css({
      top: drag_map.top, left: drag_map.left
    });
  };

  onHeldendNav = function (event) {
    var $drag_target = stateMap.$drag_target;
    if (!$drag_target) { return false; }

    $drag_target
      .removeClass('spa-x-is-drag')
      .css('background-color', stateMap.drag_bg_color);

    stateMap.drag_bg_color = undefined;
    stateMap.$drag_target = null;
    stateMap.drag_map = null;
    updateAvatar($drag_target);
  };

  onSetchatee = function (event, arg_map) {
    var
      $nav = $(this),
      new_chatee = arg_map.new_chatee,
      old_chatee = arg_map.old_chatee;

    // 네이게이션 영역에 있는 사용자 아바타를 강조하기 위해 사용
    // new_chatee.name, old_chatee.name 등 참고.

    // 여기서 old_chatee 아바타의 하이라이트를 제거
    if (old_chatee) {
      $nav
        .find('.spa-avtr-box[data-id=' + old_chatee.cid + ']')
        .removeClass('spa-x-is-chatee');
    }

    // 여기서 new_chatee 아바타의 하이라이트를 추가
    if (new_chatee) {
      $nav
        .find('.spa-avtr-box[data-id=' + new_chatee.cid + ']')
        .addClass('spa-x-is-chatee');
    }
  };

  onListchange = function (event) {
    var
      $nav = $(this),
      people_db = configMap.people_model.get_db(),
      user = configMap.people_model.get_user(),
      chatee = configMap.chat_model.get_chatee() || {},
      $box;

    $nav.empty();

    // 사용자가 로그아웃한 상태이면 렌더링하지 않음
    if (user.get_is_anon()) { return false; }

    people_db().each( function(person, idx) {
      var class_list;
      if (person.get_is_anon()) { return true; }
      class_list = ['spa-avtr-box'];

      if (person.id === chatee.id) {
        class_list.push('spa-x-is-chatee');
      }
      if (person.get_is_user()) {
        class_list.push('spa-x-is-user');
      }

      $box = $('<div/>')
        .addClass(class_list.join(' '))
        .css(person.css_map)
        .attr('data-id', String(person.id))
        .prop('title', spa.util_b.encodeHtml(person.name))
        .text(person.name)
        .appendTo($nav);
    });
  };

  onLogout = function () {
    jqueryMap.$container.empty();
  };
  //------------------- 이벤트 핸들러 끝 ------------------------

  //------------------- public 메서드 시작 ------------------------
  // public 메서드 /configModule/ 시작
  // 예시: spa.avtr.configModule({...});
  // 목적: 초기화 이전에 모듈을 설정.
  //      사용자 세션 동안 변경되지 않은 값들을 설정.
  // 행동:
  //      전달받은 인자를 사용해 내부 설정 테이터 객체(configMap)를 업데이트.
  //      그 외 다른 행동은 수행하지 않는다.
  // 반환값: 없음
  // 예외: 자바스크립트 에러 객체 및
  //      수용할 수 없거나 빠져 있는 인자에 대한 스택 트레이스
  //
  configModule = function (input_map) {
    spa.util.setConfigMap({
      input_map: input_map,
      settable_map: configMap.settable_map,
      config_map: configMap
    });
    return true;
  };
  // public 메서드 /configModule/ 끝

  // public 메서드 /initModule/ 시작
  // 예시: spa.avtr.initModule($container);
  // 목적: 모듈이 기능 제공을 시작하게 함
  // 인자: $container - 사용할 컨테이너
  // 행동: 채팅 사용자를 위한 아바트 인터페이스를 제공
  // 반환값: 없음
  // 예외: 없음
  //
  initModule = function ($container) {
    setJqueryMap($container);

    // 모델 전역 이벤트 바인딩
    $.gevent.subscribe($container, 'spa-setchatee', onSetchatee);
    $.gevent.subscribe($container, 'spa-listchange', onListchange);
    $.gevent.subscribe($container, 'spa-logout', onLogout);

    // 행동 바인딩
    $container
      .bind('utap', onTapNav)
      .bind('uheldstart', onHeldstartNav)
      .bind('uheldmove', onHeldmoveNav)
      .bind('uheldend', onHeldendNav);

    return true;
  };
  // public 메서드 반환
  return {
    configModule: configModule,
    initModule: initModule
  };
  //------------------- public 메서드 끝 ------------------------
}());