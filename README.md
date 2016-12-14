node-redis-embeded-lua
==================
~~~js
    class YourBussiness() {
        constructor(redisClient) {
            this.client = redisClient;
        }
    }

    YourBussiness.prototype.set = (function() {
        var script = `
            redis.pcall('select', 1);
            local r = redis.call('set', 'blablaa');
            redis.pcall('select', 2);
            .......
        `;
        var sha1 = redisClient.sha1sum(script);
        return function(key, val) {
            return this.client.evalScript(script, sha1, 1, key, val);
        };
    })();

    YourBussiness.prototype.get = (function() {
        var script = `
            redis.pcall('select', 1);
            local r = redis.call('get', 'blablaba');
            redis.pcall('select', 2);
            .......
        `;
        var sha1 = redisClient.sha1sum(script);
        return function(key, val) {
            return this.client.evalScript(script);
        };
    })();

    var yb = new YourBussiness();
    yb.insert('kkk', 'vvv');
    yb.get('kkk');
~~~

## Installation
`npm install redis-embeded-lua`

## Embeded Lua Script In NodeJS

* I want to write Lua Script in my code directly, but not in another lua file
* Just like embeded SQL in C language
* My Lua Script embeded in js-class-files, one method one Lua Script
* So, my bussiness code with my Lua Script(like storage procedure) together

## Hello world

~~~js
    var redis = require("redis"),
        redisClient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');

    redisEmbededLua.inject(redisClient);

    var yourBussinessDBCount = (function() {
        var script = `
            local r = redis.call('keys', '*')
            local count = 0
            for k,v in ipairs(r) do
                count = count + 1
            end
            return count
        `;
        return function() {
            return redisClient.evalScript(script);
        }
    })()

    yourBussinessDBCount()
    .then(console.log)
    .catch(console.error);
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

* audit key's type in all DB

~~~js
    var redis = require("redis"),
        redisClient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');
 
    redisEmbededLua.inject(redisClient);
 
    var maxDBConf = 16;
    var yourBussinessDBAudit = (function() {
        var script = `
            local result = {}
            for i = 0, ${maxDBConf} do
                local r = redis.pcall('select', i)
                if r.err then
                    return result
                end
                local r = redis.call('keys', '*')
                local tmp = {}
                for k,v in ipairs(r) do
                    local ty = redis.call('type', v)['ok']
                    if not tmp[ty] then tmp[ty] = 0; end
                    tmp[ty] = tmp[ty] + 1
                end
                local lst = {}
                for k,v in pairs(tmp) do
                    table.insert(lst, k)
                    table.insert(lst, v)
                end
                table.insert(result, lst)
            end
            return result
        `
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


