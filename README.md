node-redis-embeded-lua
==================
~~~js
    class YourBussiness() {
        constructor(redisClient) {
            this.client = redisClient;
            redisEmbededLua.inject(this.client);
            this.client.configDBName({
                0:  'default',
                1:  'userinfo',
                2:  'session',
                4:  'order',
                11: 'statics',
                15: 'test'
            });
        }
    }
    YourBussiness.prototype.set = (function() {
        var script = redisClient.sha1pack(`
            select('userinfo')
            call('set', KEYS[1], ARGS[1]);
            select('statics')
            call('incr', KEYS[1]);
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
            select('userinfo')
            call('get', KEYS[1])
            select('statics')
            local r = call('get', KEYS[1]);
            blablabla
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
> * e.g. method   `exists(key)`
> * e.g. property `selected_db`

## Killing Feathers

* `/* */, //` comment in Lua Script rather than `--[[]]--, --`
*  `exists(db, key)` rather than `select db; redis.call('exists', key) == 1; select back;`

## Hello world

~~~js
    var redis = require("redis"),
        redisClient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');

    redisEmbededLua.inject(redisClient);

    redisClient.configDBName({
        0: 'hello'
    });

    var yourBussinessDBCount = (function() {
        var script = redisClient.sha1pack(`
            select('hello')
            local r = call('keys', '*')
            local count = 0
            for k,v in ipairs(r) do
                /*
                 * k: index of Array
                 * v: the redis key
                 */
                //this lua function added by me. It's new.
                if exists('hello', v) then
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

### select(db)

select `db`. If `db` is string name, you must use `redisClient.configDBName(conf)`

```
    select(1)
    select('userinfo')
```

return
* success: nil  
* fail:    message  

### exists([db,] key)

* db is option. number(db index) or string(db config name). 

```
    back = selected_db
    select(db)
    exists(key)
    select(back)
    return 

```

__Note__: If you use configDBName, you must use `select(db)` instead of `redis.select(n)`

return true or false

for example:
* `if exists(key) then blablabla end`
* `if exists(1, key) then blablabla end`
* `if exists('session', key) then blablabla end`

### selected_db

number, the current selected database number

### TRUE

1

### FALSE

nil

## JavaScirpt API

### redisClient.evalScript(scriptPack, keyCount, key1, key2 ... arg1, arg2 ...)

* scriptPack:  lua script pack; Object, return by `redisClient.sha1pack(script)` required
* keyCount:    keys's count. like node-redis's eval method. It's optional when it is zero
* key1 - keyn: keys; optional
* arg1 - argn: arguments; optional

return Promise

### redisClient.sha1pack(script)

* script: your lua scirpt; string

return object, lua script pack
```
{
    text:'lua stuff',
    sha1:'sha1num'
}
```

### redisClient.configDBName(conf)

* conf Object
```
{
    0: 'default',
    1: 'session',
    5: ...
}
```
__Note__: If you use configDBName, you must use `select(db)` instead of `redis.select(n)`

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
                local err = select(i)
                if err then
                    return result
                end
                local r = call('keys', '*')
                local tmp = {}
                for k,v in ipairs(r) do
                    local ty = call('type', v)['ok']
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

## issues

processing:

* support JSON storage?

resolved:
* is there any command return the currently selected db?
* Unfortunately, Redis does not provide a way to associate names with the different databases, so you will have to keep track of what data goes where yourself.


