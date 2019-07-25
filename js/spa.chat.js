/*
 * spa.chat.js
 * SPA용 채팅 기능 모듈
 */

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global $, spa , getComputedStyle */

spa.chat = (function () {
    //------------------- 모듈 스코프 변수 시작 ------------------------
    var
        configMap = {
            main_html: String()
                + '<div class="spa-chat">'
                    + '<div class="spa-chat-head">'
                        + '<div class="spa-chat-head-toggle">+</div>'
                        + '<div class="spa-chat-head-title">'
                            + 'Chat'
                        + '</div>'
                    + '</div>'
                    + '<div class="spa-chat-closer">x</div>'
                    + '<div class="spa-chat-sizer">'
                        + '<div class="spa-chat-msgs"></div>'
                        + '<div class="spa-chat-box">'
                            + '<input type="text"/>'
                            + '<div>send</div>'
                        + '</div>'
                    + '</div>'
                + '</div>',
            settable_map: {
                slider_open_time: true,
                slider_close_time: true,
                slider_opened_em: true,
                slider_closed_em: true,
                slider_opened_title: true,
                slider_closed_title: true,

                chat_model: true,
                people_model: true,
                set_chat_anchor: true
            },
            slider_open_time: 250,
            slider_close_time: 250,
            slider_opened_em: 18,
            slider_closed_em: 2,
            slider_opened_title: 'Click to close',
            slider_closed_title: 'Click to open',
            slider_opened_min_em: 10,
            window_height_min_em: 20,

            chat_model: null,
            people_model: null,
            set_chat_anchor: null
        },
        stateMap = {
            $append_target: null,
            position_type: 'closed',
            px_per_em: 0,
            slider_hidden_px: 0,
            slider_closed_px: 0,
            slider_opened_px: 0
        },
        jqueryMap = {},
        setJqueryMap, getEmSize, setPxSizes, setSliderPosition,
        onClickToggle, configModule, initModule,
        removeSlider, handleResize
    ;
    //------------------- 모듈 스코프 변수 끝------------------------

    //------------------- 유틸리티 메서드 시작 ------------------------
    getEmSize = function (elem) {
        return Number(
            getComputedStyle(elem, '').fontSize.match(/\d*\.?\d*/)[0]
        );
    };
    //------------------- 유틸리티 메서드 끝 ------------------------

    //------------------- DOM 메서드 시작 ------------------------
    // DOM 메서드 /setJqueryMap/ 시작
    setJqueryMap = function () {
        var
            $append_target = stateMap.$append_target,
            $slider = $append_target.find('.spa-chat');

        jqueryMap = {
            $slider: $slider,
            $head: $slider.find('.spa-chat-head'),
            $toggle: $slider.find('.spa-chat-head-toggle'),
            $title: $slider.find('.spa-chat-head-title'),
            $sizer: $slider.find('.spa-chat-sizer'),
            $msgs: $slider.find('.spa-chat-msgs'),
            $box: $slider.find('.spa-chat-box'),
            $input: $slider.find('.spa-chat-input input[type=text]')
        };
    };
    // DOM 메서드 /setJqueryMap/ 끝

    // DOM 메서드 /setPxSizes/ 시작
    setPxSizes = function () {
        var px_per_em, window_height_em, opened_height_em;
        px_per_em = getEmSize(jqueryMap.$slider.get(0));
        window_height_em = Math.floor(
            ($(window).height() / px_per_em) + 0.5
        );
        opened_height_em
            = window_height_em > configMap.window_height_min_em
            ? configMap.slider_opened_em
            : configMap.slider_opened_min_em;
        stateMap.px_per_em = px_per_em;
        stateMap.slider_closed_px = configMap.slider_closed_em * px_per_em;
        stateMap.slider_opened_px = opened_height_em * px_per_em;
        jqueryMap.$sizer.css({
            height: (opened_height_em - 2) * px_per_em
        });
    };
    // DOM 메서드 /setPxSizes/ 끝

    // public 메서드 /setSliderPosition/ 시작
    // 예시: spa.chat.setSliderPosition('closed');
    // 목적: 채팅 슬라이더를 요청한 위치로 옮김
    // 인자:
    //  * position_type - enum('closed', 'opened', 'hidden')
    //  * 콜백 - 슬라이더 애니메이션 완료 시점에 호출할 콜백
    //    이 콜백은 슬라이더 div를 나타내는 제이쿼리 컬렉션을
    //    단일 인자로 받는다.
    // 행동:
    //  이 메서드는 슬라이더를 요청한 위치로 옮긴다.
    //  요청한 위치가 현재 위치와 같다면, 추가 행동을 하지 않고
    //  바로 종료된다.
    // 반환값:
    //  * true - 요청한 위치를 달성한 경우
    //  * false - 요청한 위치를 달성하지 못한 경우
    // 예외: 없음
    //
    setSliderPosition = function (position_type, callback) {
        var
            height_px, animate_time, slider_title, toggle_text;

        // 슬라이더가 이미 요청한 위치에 있으면 true를 반환
        if (stateMap.position_type === position_type) {
            return true;
        }

        // 애니메이션 파라미터를 준비
        switch ( position_type ) {
            case 'opened':
                height_px = stateMap.slider_opened_px;
                animate_time = configMap.slider_open_time;
                slider_title = configMap.slider_opened_title;
                toggle_text = '=';
                break;

            case 'hidden':
                height_px = 0;
                animate_time = configMap.slider_open_time;
                slider_title = '';
                toggle_text = '+';
                break;

            case 'closed':
                height_px = stateMap.slider_closed_px;
                animate_time = configMap.slider_close_time;
                slider_title = configMap.slider_closed_title;
                toggle_text = '+';
                break;

            // 알지 못하는 position_type에 대해서는 false를 반환
            default: return false;
        }

        // 슬라이더 위치 변경 애니메이션
        stateMap.position_type = '';
        jqueryMap.$slider.animate(
            {height: height_px},
            animate_time,
            function() {
                jqueryMap.$toggle.prop('title', slider_title);
                jqueryMap.$toggle.text(toggle_text);
                stateMap.position_type = position_type;
                if (callback) { callback(jqueryMap.$slider); }
            }
        );
        return true;
    };
    // public DOM 메서드 /setSliderPosition/ 끝
    //------------------- DOM 메서드 끝 ------------------------

    //------------------- 이벤트 핸들러 시작 ------------------------
    onClickToggle = function (event) {
        var set_chat_anchor = configMap.set_chat_anchor;
        if (stateMap.position_type === 'opened') {
            set_chat_anchor('closed');
        }
        else if (stateMap.position_type === 'closed') {
            set_chat_anchor('opened');
        }
        return false;
    };
    //------------------- 이벤트 핸들러 끝 ------------------------

    //------------------- public 메서드 시작 ------------------------
    // public 메서드 /configModule/ 시작
    // 예시: spa.chat.configModule({ slider_open_em: 18 });
    // 목적: 초기화 전에 모듈을 설정
    // 인자:
    //  * set_chat_anchor - 열린(opened) 상태나 닫힌(closed) 상태를 나타내기 위해
    //    URI 앵커를 수정할 콜백. 이 콜백은 요청한 상태를 충족할 수 없는 경우
    //    false를 반환해야 한다.
    //  * chat_model - 채팅 모델 객체는 인스턴스 메시징과 상호작용하는
    //    메서드를 제공.
    //  * people_model - people 모델 객체는 모델에서 가진 사람들 목록을 관리하기 위한
    //    메서드를 제공
    //  * slider_* settings. 모든 설정은 선택적인 스칼라값이다.
    //    전체 설정 목록은 mapConfig.settable_map 참고
    // 예시: slider_open_em은 em으로 지정한 열린 상태의 높이다.
    // 행동:
    //      넘겨받은 인자를 사용해 내부 설정 테이터 객체(configMap)를 업데이트한다.
    //      그 외 다른 행동은 수행하지 않는다.
    // 반환값: true
    // 예외: 자바스크립트 에러 객체 및 넘겨받을 수 없거나 누락된 인자에 대한
    //      스택트레이스
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
    // 예시: spa.chat.initModule($('#div_id'));
    // 목적: Chat에서 기능을 사용자에게 제공하게 한다.
    // 인자:
    //  * $append_target (예시: $('#div_id')).
    //    단일 DOM 컨테이너를 나타내는 제이쿼리 컬렉션
    // 행동:
    //    인자로 받은 컨테이너에 채팅 슬라이더를 첨부하고
    //    컨테이너를 HTML 콘텐츠로 채운다. 그런 다음 채팅방 인터페이스를 제공하기 위해
    //    엘리먼트, 이벤트, 핸들러를 초기화한다.
    // 반환값: 성공 시 true, 실패 시 false
    // 예외:
    //
    initModule = function ($append_target) {
        $append_target.append(configMap.main_html);
        stateMap.$append_target = $append_target;
        setJqueryMap();
        setPxSizes();

        // 기본 제목 및 상태로 채팅 슬라이더를 초기화
        jqueryMap.$toggle.prop('title', configMap.slider_closed_title);
        jqueryMap.$head.click(onClickToggle);
        stateMap.position_type = 'closed';
        return true;
    };
    // public 메서드 /initModule/ 끝

    // public 메서드 /removeSlider/ 시작
    // 목적:
    //  * chatSlider DOM 엘리먼트 제거
    //  * 초기 상태로 복원
    //  * 콜백 및 다른 데이터에 대한 포인터 제거
    // 인자: 없음
    // 반환값: true
    // 예외: 없음
    //
    removeSlider = function () {
        // 초기화 및 상태 복원
        // DOM 컨테이너 제거. 컨테이너를 제거하면 이벤트 바인딩도 함께 제거된다.
        if (jqueryMap.$slider) {
            jqueryMap.$slider.remove();
            jqueryMap = {};
        }
        stateMap.$append_target = null;
        stateMap.position_type = 'closed';

        // 키 설정 초기화
        configMap.chat_model = null;
        configMap.people_model = null;
        configMap.set_chat_anchor = null;

        return true;
    };
    // public 메서드 /removeSlider/ 끝

    // public 메서드 /handleResize/ 시작
    // 목적:
    //  창 리사이즈 이벤트가 일어나면 필요에 따라
    //  이 모듈에서 제공하는 프레젠테이션을 조정
    // 행동:
    //  창 높이나 너비가 최소 크기 미만이면
    //  줄어든 창 크기에 맞춰 채팅 슬라이더 크기를 변경
    // 반환값: Boolean
    //  * false - 리사이즈가 불핑효한 경우
    //  * true - 리사이즈가 필요한 경우
    // 예외: 없음
    //
    handleResize = function () {
        // 슬라이더 컨테이너가 없으면 아무 일도 하지 않음
        if ( ! jqueryMap.$slider) { return false; }

        setPxSizes();
        if (stateMap.position_type === 'opened') {
            jqueryMap.$slider.css({ height: stateMap.slider_opened_px });
        }
        return true;
    };
    // public 메서드 /handleResize/ 끝

    // public 메서드 반환
    return {
        setSliderPosition: setSliderPosition,
        configModule: configModule,
        initModule: initModule,
        removeSlider: removeSlider,
        handleResize: handleResize
    };
    //------------------- public 메서드 끝 ------------------------
}());
