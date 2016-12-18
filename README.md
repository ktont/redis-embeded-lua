node-redis-embeded-lua
==================
~~~js
    class YourBussiness() {
        constructor(redisClient) {
            this.client = redisClient;
        }
    }
    YourBussiness.prototype.set = (function() {
        var script = redisClient.sha1pack(`
            redis.select(1)
            redis.call('lpush', KEYS[1]);
            redis.select(2)
            local r = redis.call('set', KEYS[1], ARGS[1]);
            /*
             * you can comment here!
             */
            .......
        `);
        return function(key, val) {
            return this.client.evalScript(script, 1, key, val);
        };
    })();

    YourBussiness.prototype.get = (function() {
        var script = redisClient.sha1pack(`
            redis.select(1)
            redis.call('rpop', KEYS[1])
            redis.select(2)
            local r = redis.call('get', 'blablaba');
            .......
        `);
        return function(key) {
            return this.client.evalScript(script, 1, key);
        };
    })();

    var yb = new YourBussiness();
    yb.insert('kkk', 'vvv');
    yb.get('kkk');
~~~

## Installation
`npm install redis-embeded-lua`

## I want

1) Embeded Lua Script In NodeJS
> I want to write Lua Script in my code directly,
> rather than another lua file.
> Just like embeded SQL in C language.

2) Upgrade Lua
> * e.g. `redis.exists(key)`
> * e.g. `redis.TRUE` `redis.FALSE`

## Killing Feathers

* `/* */, //` comment in Lua Script rather than `--[[]]--, --`
*  `redis.exists(key)` rather than `redis.call('exists', key) == 1`

## Hello world

~~~js
    var redis = require("redis"),
        redisClient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');

    redisEmbededLua.inject(redisClient);

    var yourBussinessDBCount = (function() {
        var script = redisClient.sha1pack(`
            local r = redis.call('keys', '*')
            local count = 0
            for k,v in ipairs(r) do
                /*
                 * k: index of Array
                 * v: the redis key
                 */
                //this lua function added by me. It's new.
                if redis.exists(v) then
                    count = count + 1
                end
            end
            return count
        `);
        return function() {
            return redisClient.evalScript(script);
        }
    })()

    yourBussinessDBCount()
    .then(console.log)
    .catch(console.error);
~~~


## LUA API

### redis.select(db)

select `db` number

return
success: nil  
fail:    message  

### redis.exists(key)

`if redis.exists(key) then blablabla end`

### redis.TRUE

1

### redis.FALSE

nil


## JavaScirpt API

### redisClient.evalScript(scriptPack, keyCount, key1, key2 ... arg1, arg2 ...)

#### params
* scriptPack:  lua script pack; Object, return by `redisClient.sha1pack(script)` required
* keyCount:    keys's count. like node-redis's eval method. It's optional when it is zero
* key1 - keyn: keys; optional
* arg1 - argn: arguments; optional

#### return
Promise

### redisClient.sha1pack(script)

### params

* script: your lua scirpt; string

### return
Object, lua script pack
```
{
    text:'lua stuff',
    sha1:'sha1num'
}
```

## example

* audit key's type in all DB
node examples/auditDB.js

~~~js
    var redis = require("redis"),
        redisClient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');

    redisEmbededLua.inject(redisClient);

    var maxDBConf = 16;
    var yourBussinessDBAudit = (function() {
        var script = redisClient.sha1pack(`
            local result = {}
            for i = 0, ${maxDBConf} do
                local err = redis.select(i)
                if err then
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
        `);
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
