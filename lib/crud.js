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
  url = 'mongodb://localhost:27017',
  dbName = 'spa',
  connectDb,
  loadSchema, checkSchema, clearIsOnline,
  checkType, constructObj, readObj,
  updateObj, destroyObj,
  mongodb = require('mongodb'),
  fsHandle = require('fs'),
  JSV = require('JSV').JSV,
  MongoClient = mongodb.MongoClient,
  validator = JSV.createEnvironment(),
  objTypeMap = {'user': {}};
// ------------ 모듈 스코프 변수 끝 -----------

// ------------ 유틸리티 메서드 시작 -----------
connectDb = function (callback) {
  MongoClient.connect(url, {}, function (error, client) {
    var db = client.db(dbName);
    callback(db, client);
  });
};

loadSchema = function (schema_name, schema_path) {
  fsHandle.readFile(schema_path, 'utf8', function (err, data) {
    objTypeMap[schema_name] = JSON.parse(data);
  });
};

checkSchema = function (obj_type, obj_map, callback) {
  var
    schema_map = objTypeMap[obj_type],
    report_map = validator.validate(obj_map, schema_map);
  callback(report_map.errors);
};

clearIsOnline = function () {
  updateObj(
    'user',
    {is_online: true},
    {is_online: false},
    function (response_map) {
      console.log('All users set to offline', response_map);
    }
  )
};
// ------------ 유틸리티 메서드 끝 -----------

// ------------ public 메서드 시작 -----------
checkType = function (obj_type) {
  if (!objTypeMap[obj_type]) {
    return ({ error_msg: 'Object type "' + obj_type  + '" is not supported.'});
  }
  return null;
};

constructObj = function (obj_type, obj_map, callback) {
  var type_check_map = checkType(obj_type);
  if (type_check_map) {
    callback(type_check_map);
    return;
  }
  checkSchema(
    obj_type, obj_map,
    function (error_list) {
      if (error_list.length === 0) {
        connectDb(function(db, client) {
          db.collection(obj_type).insert(obj_map, {},
            function (error, result_map) {
              client.close();
              callback(result_map.ops);
            });
        });
      } else {
        callback({
          error_msg: 'Input document not valid',
          error_list: error_list
        });
      }
    }
  );
};

readObj = function (obj_type, find_map, fields_map, callback) {
  var type_check_map = checkType(obj_type);
  if (type_check_map) {
    callback(type_check_map);
    return;
  }
  connectDb(function(db, client) {
    db.collection(obj_type).find(find_map, fields_map).toArray(
      function (inner_error, map_list) {
        client.close();
        callback(map_list)
      }
    );
  });
};

updateObj = function (obj_type, find_map, set_map, callback) {
  var type_check_map = checkType(obj_type);
  if (type_check_map) {
    callback(type_check_map);
    return;
  }
  checkSchema(
    obj_type, set_map,
    function (error_list) {
      if (error_list.length === 0) {
        connectDb(function(db, client) {
          db.collection(obj_type).update(
            find_map,
            {$set: set_map},
            {multi: true, upsert: false},
            function (inner_error, update_count) {
              client.close();
              callback({update_count: update_count});
            });
        });
      } else {
        callback({
          error_msg: 'Input document not valid',
          error_list: error_list
        });
      }
    }
  );
};

destroyObj = function (obj_type, find_map, callback) {
  var type_check_map = checkType(obj_type);
  if (type_check_map) {
    callback(type_check_map);
    return;
  }
  connectDb(function(db, client) {
    var options_map = {single: true};
    db.collection(obj_type).remove(find_map, options_map,
      function (inner_error, delete_count) {
        client.close();
        callback({delete_count: delete_count});
      }
    );
  });
};
// ------------ public 메서드 끝 -----------
module.exports = {
  makeMongoId: mongodb.ObjectID,
  checkType: checkType,
  construct: constructObj,
  read: readObj,
  update: updateObj,
  destroy: destroyObj
};
// ------------ 모듈 초기화 시작 -----------
console.log('** CRUD module loaded **');
clearIsOnline();

// 스키마를 메모리(objTypeMap)로 로드
(function () {
  var schema_name, schema_path;
  for (schema_name in objTypeMap) {
    if (objTypeMap.hasOwnProperty(schema_name)) {
      schema_path = __dirname + '/' + schema_name + '.json';
      loadSchema(schema_name, schema_path);
    }
  }
}());
// ------------ 모듈 초기화 끝 -----------