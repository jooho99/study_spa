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
  configRoutes,
  MongoClient = require('mongodb').MongoClient,
  assert = require('assert'),
  url = 'mongodb://localhost:27017',
  dbName = 'spa';
// ------------ 모듈 스코프 변수 끝 ------------

// ------------ public 메서드 시작 ------------
configRoutes = function (app, server) {
  app.get('/', function(request, response) {
    response.redirect('/spa.html');
  });

  app.all('/:obj_type/*?', function (request, response, next) {
    response.contentType('json');
    next();
  });

  app.get('/:obj_type/list', function (request, response) {
    MongoClient.connect(url, {}, function (outer_error, client) {
      assert.equal(null, outer_error);
      client.db(dbName).collection('user').find().toArray(function(inner_error, map_list) {
        assert.equal(null, inner_error);
        client.close();
        response.send(map_list);
      });
    });
  });

  app.post('/:obj_type/create', function (request, response) {
    response.send({title: request.params.obj_type + ' created'});
  });

  app.get('/:obj_type/read/:id([0-9]+)', function (request, response) {
    response.send({
      title: request.params.obj_type + ' with id ' + request.params.id + ' found'
    });
  });

  app.post('/:obj_type/update/:id([0-9]+)', function (request, response) {
    response.send({
      title: request.params.obj_type + ' with id ' + request.params.id + ' updated'
    });
  });

  app.get('/:obj_type/delete/:id([0-9]+)', function (request, response) {
    response.send({
      title: request.params.obj_type + ' with id ' + request.params.id + ' deleted'
    });
  });
};

module.exports = { configRoutes: configRoutes };
// ------------ public 메서드 끝 ------------
