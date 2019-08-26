/*
 * crud.js - CRUD db 기능 제공 모듈
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
  checkType, constructObj, readObj,
  updateObj, destroyObj;
// ------------ 모듈 스코프 변수 끝 -----------

// ------------ public 메서드 시작 -----------
checkType = function () {};
constructObj = function () {};
readObj = function () {};
updateObj = function () {};
destroyObj = function () {};
// ------------ public 메서드 끝 -----------
module.exports = {
  makeMongoId: null,
  checkType: checkType,
  construct: constructObj,
  read: readObj,
  update: updateObj,
  destroy: destroyObj
};
// ------------ 모듈 초기화 시작 -----------
console.log('** CRUD module loaded **');
// ------------ 모듈 초기화 끝 -----------