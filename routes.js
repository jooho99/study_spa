/*
 * routes.js - 라우팅 제공 모듈
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
  loadSchema, configRoutes,
  mongodb = require('mongodb'),
  fsHandle = require('fs'),
  assert = require('assert'),
  MongoClient = mongodb.MongoClient,
  makeMongoId = mongodb.ObjectID,
  url = 'mongodb://localhost:27017',
  dbName = 'spa',
  objTypeMap = {'user': {}};

// ------------ 모듈 스코프 변수 끝 ------------

// ------------ 유틸리티 메서드 시작 -----------
loadSchema = function (schema_name, schema_path) {
  fsHandle.readFile(schema_path, 'utf8', function (err, data) {
    objTypeMap[schema_name] = JSON.parse(data);
  });
};
// ------------ 유틸리티 메서드 끝 -----------

// ------------ public 메서드 시작 ------------
configRoutes = function (app, server) {
  app.get('/', function(request, response) {
    response.redirect('/spa.html');
  });

  app.all('/:obj_type/*?', function (request, response, next) {
    response.contentType('json');
    if (objTypeMap[request.params.obj_type]) {
      next();
    } else {
      response.send({ error_msg: request.params.obj_type
        + ' is not a valid object type'});
    }
  });

  app.get('/:obj_type/list', function (request, response) {
    MongoClient.connect(url, {}, function (outer_error, client) {
      assert.equal(null, outer_error);
      client
        .db(dbName)
        .collection(request.params.obj_type)
        .find()
        .toArray(function(inner_error, map_list) {
          assert.equal(null, inner_error);
          client.close();
          response.send(map_list);
        });
    });
  });

  app.post('/:obj_type/create', function (request, response) {
    MongoClient.connect(url, {}, function (outer_error, client) {
      assert.equal(null, outer_error);
      client
        .db(dbName)
        .collection(request.params.obj_type)
        .insertOne(request.body, function (inner_error, result_map) {
          client.close();
          response.send(result_map);
        });
    });
  });

  app.get('/:obj_type/read/:id', function (request, response) {
    MongoClient.connect(url, {}, function(outer_error, client) {
      assert.equal(null, outer_error);
      client
        .db(dbName)
        .collection(request.params.obj_type)
        .findOne({_id: makeMongoId(request.params.id)}, function (inner_error, result_map) {
          client.close();
          response.send(result_map);
        });
    });
  });

  app.post('/:obj_type/update/:id', function (request, response) {
    MongoClient.connect(url, {}, function (outer_error, client) {
      assert.equal(null, outer_error);
      client
        .db(dbName)
        .collection(request.params.obj_type)
        .updateOne(
          {_id: makeMongoId(request.params.id)}
          ,{$set: request.body}
          ,function (inner_error, result_map) {
            client.close();
            response.send(result_map);
          });
    });
  });

  app.get('/:obj_type/delete/:id', function (request, response) {
    MongoClient.connect(url, {}, function(outer_error, client) {
      assert.equal(null, outer_error);
      client
        .db(dbName)
        .collection(request.params.obj_type)
        .deleteOne({_id: makeMongoId(request.params.id)}, function (inner_error, delete_count) {
          response.send({delete_count: delete_count});
        });
    });
  });
};

module.exports = { configRoutes: configRoutes };
// ------------ public 메서드 끝 ------------

// ------------ 모듈 초기화 시작 ------------
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
// ------------ 모듈 초기화 끝 ------------