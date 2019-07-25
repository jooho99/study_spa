/*
 * spa.shell.js
 * SPA용 셸 모듈
 */

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global $, spa */

spa.shell = (function () {
    //------------------- 모듈 스코프 변수 시작 ------------------------
    var
        configMap = {
            anchor_schema_map: {
                chat: {opened: true, closed: true}
            },
            resize_interval: 200,
            main_html: String() +
                '<div class="spa-shell-head">' +
                '<div class="spa-shell-head-logo"></div>' +
                '<div class="spa-shell-head-acct"></div>' +
                '<div class="spa-shell-head-search"></div>' +
                '</div>' +
                '<div class="spa-shell-main">' +
                '<div class="spa-shell-main-nav"></div>' +
                '<div class="spa-shell-main-content"></div>' +
                '</div>' +
                '<div class="spa-shell-foot"></div>' +
                '<div class="spa-shell-modal"></div>'
        },
        stateMap = {
            $container: undefined,
            anchor_map: {},
            resize_idto: undefined
        },
        jqueryMap = {},
        copyAnchorMap, setJqueryMap,
        changeAnchorPart, onHashchange, onResize,
        setChatAnchor, initModule;
    //------------------- 모듈 스코프 변수 끝------------------------

    //------------------- 유틸리티 메서드 시작 ------------------------
    // 저장된 앵커 맵의 복사본을 저장한다. 이를 통해 연산 부담을 최소화한다.
    copyAnchorMap = function () {
        return $.extend(true, {}, stateMap.anchor_map);
    };
    //------------------- 유틸리티 메서드 끝 ------------------------

    //------------------- DOM 메서드 시작 ------------------------
    // DOM 메서드 /setJqueryMap/ 시작
    setJqueryMap = function () {
        var $container = stateMap.$container;
        jqueryMap = { $container: $container };
    };
    // DOM 메서드 /setJqueryMap/ 끝

    // DOM 메서드 /changeAnchorPart/ 시작
    // 목적: URI 앵커 컴포넌트의 일부 영역 변경
    // 인자:
    //  * arg_map - URI 앵커 중 변경할 부분을 나타내는 맵
    // 반환값: boolean
    //  * true - URI의 앵커 부분이 변경됨
    //  * false - URI의 앵커 부분이 변경되지 않음
    // 행동:
    //      현재 앵커는 stateMap.anchor_map에 저장되어 있다.
    //      인코딩 방식은 uriAnchor를 참고하자.
    //      이 메서드는
    //  * copyAnchorMap()을 사용해 이 맵을 복사한다.
    //  * arg_map을 사용해 키-값을 수정한다.
    //  * 인코딩 과장에서 독립적인 값과 의존적인 값을 서로 구분한다.
    //  * uriAnchor를 활용해 URI 변경을 시도한다.
    //  * 성공 시 true, 실패 시 false를 반환한다.
    //
    changeAnchorPart = function (arg_map) {
        var
            anchor_map_revise = copyAnchorMap(),
            bool_return = true,
            key_name, key_name_dep;

        // 변경 사항을 앵커 맵으로 합치는 작업 시작
        KEYVAL:
            for (key_name in arg_map) {
                if (arg_map.hasOwnProperty(key_name)) {
                    // 반복 과정 중 의존적인 키는 건너뀜
                    if (key_name.indexOf('_') === 0) {
                        continue KEYVAL;
                    }

                    // 독립적 키 값을 업데이트
                    anchor_map_revise[key_name] = arg_map[key_name];

                    // 대응되는 의존적 키를 업데이트
                    key_name_dep = '_' + key_name;
                    if (arg_map[key_name_dep]) {
                        anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
                    } else {
                        delete anchor_map_revise[key_name_dep];
                        delete anchor_map_revise['_s' + key_name_dep];
                    }
                }
            }
        // 앵커 맵으로 변경 사항 병합 작업 끝

        // URI 업데이트를 시도, 작업이 성공하지 못하면 원래대로 복원
        try {
            $.uriAnchor.setAnchor(anchor_map_revise);
        } catch (error) {
            // URI를 기존 상태로 대체
            $.uriAnchor.setAnchor(stateMap.anchor_map, null, true);
            bool_return = false;
        }
        // URI 업데이트 시도 끝

        return bool_return;
    };
    // DOM 메서드 /changeAnchorPart/ 끝
    //------------------- DOM 메서드 끝 ------------------------

    //------------------- 이벤트 핸들러 시작 ------------------------
    // 이벤트 핸들러 /onHashchange/ 시작
    // 목적: hashchange 이벤트의 처리
    // 인자:
    //  * event - 제이쿼리 이벤트 객체.
    // 설정: 없음
    // 반환값: false
    // 행동:
    //  * URI 앵커 컴포넌트를 파싱
    //  * 요청받은 애플리케이션 상태를 현재 상태와 비교
    //  * 요청받은 상태가 기존 상태와 다르고, 앵커 스키마에서 이 상태를 허용할 때만
    //    상태를 변경
    //
    onHashchange = function (event) {
        var
            _s_chat_previous, _s_chat_proposed, s_chat_proposed,
            anchor_map_proposed,
            is_ok = true,
            anchor_map_previous = copyAnchorMap();

        // 앵커 파싱을 시도
        try {
            anchor_map_proposed = $.uriAnchor.makeAnchorMap();
        } catch (error) {
            $.uriAnchor.setAnchor(anchor_map_previous, null, true);
            return false;
        }
        stateMap.anchor_map = anchor_map_proposed;

        // 편의 변수
        _s_chat_previous = anchor_map_previous._s_chat;
        _s_chat_proposed = anchor_map_proposed._s_chat;

        // 변경된 경우 채팅 컴포넌트 수정 시작
        if (!anchor_map_previous
            || _s_chat_previous !== _s_chat_proposed
        ) {
            s_chat_proposed = anchor_map_proposed.chat;
            switch (s_chat_proposed) {
                case 'opened':
                    is_ok = spa.chat.setSliderPosition('opened');
                    break;
                case 'closed':
                    is_ok = spa.chat.setSliderPosition('closed');
                    break;
                default:
                    spa.chat.setSliderPosition('closed');
                    delete anchor_map_proposed.chat;
                    $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
            }
        }
        // 변경된 경우 채팅 컴포넌트 수정 끝
        // 슬라이더 변경이 거부된 경우 앵커 복원 시작
        if (!is_ok) {
            if (anchor_map_previous) {
                $.uriAnchor.setAnchor(anchor_map_previous, null, true);
                stateMap.anchor_map = anchor_map_previous;
            } else {
                delete anchor_map_proposed.chat;
                $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
            }
        }
        // 슬라이더 변경이 거부된 경우 앵커 복원 끝
        return false;
    };
    // 이벤트 핸들러 /onHashchange/ 끝

    // 이벤트 핸들러 /onResize/ 시작
    onResize = function () {
        if (stateMap.resize_idto) { return true; }
        spa.chat.handleResize();
        stateMap.resize_idto = setTimeout(
            function () { stateMap.resize_idto = undefined; },
            configMap.resize_interval
        );

        return true;
    };
    // 이벤트 핸들러 /onResize/ 끝
    //------------------- 이벤트 핸들러 끝 ------------------------

    //------------------- 콜백 시작 ------------------------
    // 콜백 메서드 /setChatAnchor/ 시작
    // 예시: setChatAnchor('closed');
    // 목적: 앵커의 채팅 컴포넌트 변경
    // 인자:
    //  * position_type - 'closed' 또는 'opened'
    // 행동:
    //    변경이 가능한 경우 'chat' URI 앵커 파라미터를 요청값으로 변경
    // 반환값:
    //  * true - 요청한 앵커 부분을 업데이트한 경우
    //  * false - 요청한 앵커 부분을 업데이트하지 못한 경우
    // 예외: 없음
    setChatAnchor = function (position_type) {
        return changeAnchorPart({chat: position_type});
    };
    // 콜백 메서드 /setChatAnchor/ 끝
    //------------------- 콜백 끝 ------------------------
    //------------------- public 메서드 시작 ------------------------
    // public 메서드 /initModule/ 시작
    // 예시: spa.shell.initModule($('#app_div_id'));
    // 목적:
    //  셀이 사용자에게 기능을 제공하게끔 지시
    // 인자:
    //  * $container (예시: $('#app_div_id')).
    //    단일 DOM 컨테이너를 나타내는 제이쿼리 컬렉션
    // 행동:
    //  $container를 UI의 셸로 채우고
    //  기능 모듈을 초기화 및 설정한다.
    //  셸에서는 URI 앵커 및 쿠키 관리 같은 브라우저 문제도 책임진다.
    // 반환값: 없음
    // 예외: 없음
    initModule = function ($container) {
        // HTML을 로드한 후 제이쿼리 컬랙션 객체를 매핑한다.
        stateMap.$container = $container;
        $container.html(configMap.main_html);
        setJqueryMap();

        // 우리 스키마를 사용하게끔 uriAnchor를 변경
        $.uriAnchor.configModule({
            schema_map: configMap.anchor_schema_map
        });

        // 기능 모듈을 설정 및 초기화
        spa.chat.configModule({
            set_chat_anchor: setChatAnchor,
            chat_model: spa.model.chat,
            people_model: spa.model.people
        });
        spa.chat.initModule(jqueryMap.$container);

        // URI 앵커 변경 이벤트를 처리.
        // 이 작업은 모든 기능 모듈이 설정 및 초기화된 후에 수행된다.
        // 이렇게 하지 않으면 페이지 로드 시점에 앵커를 판단하는 데 사용되는
        // 트리거 이벤트를 모듈에서 처리할 수 없게 된다.
        $(window)
            .bind('resize', onResize)
            .bind('hashchange', onHashchange)
            .trigger('hashchange');
    };
    // public 메서드 /initModule/ 끝

    return {initModule: initModule};
    //------------------- public 메서드 끝 ------------------------
}());
