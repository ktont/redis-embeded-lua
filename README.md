node-redis-embeded-lua
==================

~~~js
    var redis = require("redis"),
        redisClient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');

    redisEmbededLua.bind(redisClient);

    var yourBussinessDBCount = (function() {
        var script = [
            "local r = redis.call('keys', '*')",
            "local count = 0",
            "for k,v in ipairs(r) do",
                "count = count + 1",
            "end",
            "return count"
        ].join('\n');
        return function () {
            return redisClient.evalScript(script);
        };
    })();

    yourBussinessDBCount()
    .then(console.log)
    .catch(console.error);
~~~

## Installation
`npm install redis-embeded-lua`

## Embeded Lua Script In NodeJS

* I want to write Lua Script in my code directly, but not in another lua file
* Just like embeded SQL in C language
* My Lua Script embeded in js-class-files, one method one Lua Script
* So, my bussiness code with my Lua Script(like storage procedure) together

## Usage

* You can inject method in node-redis's instance (recommend)
* Then you can use redisClient.evalScript and redisClient.sha1sum method
* redisClient.evalScript method just like redisClient.eval but performance is promoted
* redisClient.sha1sum is a utils, compute a string's sha1 value

~~~js
    var redis = require("redis"),
        redisclient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');

    redisEmbededLua.bind(redisclient);

    var script = 'return {KEYS[1], ARGV[1], ARGV[2]}';
    var sha1 = redisclient.sha1sum(script);
    redisclient.evalScript(script, sha1, 1, 'key1', 'arg1', 'arg2')
    .then(console.log)
    .catch(console.error);
    //sha1 is optional
    redisclient.evalScript(script, 1, 'key1', 'arg1', 'arg2')
    .then(console.log)
    .catch(console.error);
~~~

* You can use redisClient and redisEmbededLua together(not recommend)

~~~js
    var redisEmbededLua = require('redis-embeded-lua');
    var redis = require("redis"),
        redisclient = redis.createClient();

    redisEmbededLua.evalScript(redisclient, "return 'Hello world.'").then(console.log);
~~~

## API

### redisClient.evalScript(script, [sha1], keyCount, key1, key2 ... arg1, arg2 ...)

#### parameter
* script:      your lua script; String; required
* sha1:        sha1 of your scirpt; String; optional
* keyCount:    keys's count. like node-redis's eval method. It's optional when it is zero
* key1 - keyn: keys; optional
* arg1 - argn: arguments; optional

#### return
Promise

### redisClient.sha1sum(script)

#### parameter
* script: your lua scirpt

#### return
sha1, string

## example

* The first example, count every key's type in all DB
* The second example, insert a record in DB

__Tip:__ put method in closer, performance-promote.

example 1
~~~js
    var redis = require("redis"),
        redisClient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');

    redisEmbededLua.bind(redisClient);

    var yourBussinessDBAudit = (function() {
        var script = [
            "local result = {}",
            "for i = 0, 16 do",
                /*
                 * pcall, return [Error: ERR invalid DB index], if
                 * the db not exists.
                 */
                "local r = redis.pcall('select', i)",
                "if r.err then",
                    "return result",
                "end",
                "local r = redis.call('keys', '*')",
                "local tmp = {}",
                "for k,v in ipairs(r) do",
                    "local ty = redis.call('type', v)['ok']", 
                    "if not tmp[ty] then tmp[ty] = 0; end",
                    "tmp[ty] = tmp[ty] + 1",
                "end",
                "local lst = {}",
                "for k,v in pairs(tmp) do",
                    "table.insert(lst, k)",
                    "table.insert(lst, v)",
                "end",
                "table.insert(result, lst)",
            "end",
            "return result"
        ].join('\n');
        return function () {
            return redisClient.evalScript(script);
        };
    })();

    return yourBussinessDBAudit()
    .then(function(ret) {
        console.log(ret);
        redisClient.unref();
    })
    .catch(function(err) {
        console.error(err);
        redisClient.unref();
    });
~~~

example 2
~~~js
    var redis = require("redis"),
        redisClient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');

    redisEmbededLua.bind(redisClient);

    var yourBussinessInsertData = (function () {
        var script = [
            "local userinfo = cjson.decode(ARGV[1])",
            "local keyExistsFlag = redis.call('exists', KEYS[1])",
            "for k,v in pairs(userinfo) do",
                "redis.call('hset', KEYS[1], k, v)",
            "end",
            "redis.call('hset', KEYS[1], 'updateTime', ARGV[2])",
            "if keyExistsFlag == 0 then",
                "redis.call('hset', KEYS[1], 'createTime', ARGV[2])",
            "end",
            "return {'ok', keyExistsFlag == 0 and 'insert '..KEYS[1] or 'update '..KEYS[1]}"
        ].join('\n');
        var sha1 = redisClient.sha1sum(script);

        return function(key, json) {
            return redisClient.evalScript(script, sha1, 1, 
                key, JSON.stringify(json), new Date().toString());
        }
    })();

    yourBussinessInsertData('key1', {id: 1, name:'abc'})
    .then(function(ret) {
        console.log(ret);
        redisClient.unref();
    })
    .catch(function(err) {
        console.error(err);
        redisClient.unref();
    });
~~~
