node-redis-embeded-lua
==================

~~~lua
    vi ./demo/arithmetic.lua
exports.PI = 3.14;

exports.add = function(a,b)
    return a+b
end

exports.sub = function(a,b)
    return a-b;
end

exports.mul = function(a,b)
    return a*b;
end

exports.div = function(a,b)
    return a/b;
end
~~~

~~~js
    node ./this.js
var redis = require("redis"),
    redisClient = redis.createClient();
var redisEmbededLua = require('redis-embeded-lua');

redisEmbededLua.inject(redisClient);

var pack = redisClient.sha1pack(`
    local arithmetic = require('./demo/arithmetic.lua')
    //the shorthand for redis.call.
    local r = call('keys', '*')
    local count = 0
    for k,v in ipairs(r) do
        /*
         * k: index of Array
         * v: the redis key
         */
        count = arithmetic.add(count, 1)
    end
    return count
`);

redisClient.evalScript(pack)
.then(function(ret) {
    console.log('the dbsize:', ret);
    redisClient.unref();
})
.catch(function(e) {
    console.error(e.toString());
    process.exit(1);
});
~~~

## Installation
`npm install redis-embeded-lua`

## Usage
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
        select('statics')
        call('incr', 'set'..KEYS[1]);
        select('userinfo')
        call('set', KEYS[1], ARGS[1]);
    `);
    return function(key, val) {
        return this.client.evalScript(script, 1, key, val);
    };
})();

YourBussiness.prototype.get = (function() {
    var script = redisClient.sha1pack(`
        select('statics')
        call('incr', 'get'..KEYS[1]);
        select('userinfo')
        return call('get', KEYS[1])
    `);
    return function(key) {
        return this.client.evalScript(script, 1, key);
    };
})();

var yb = new YourBussiness();
~~~
---
## LUA API

### require('file')

require like nodejs. Only support one level(and in embeded lua).

### call(ops, key, arg, ...)

alias for redis.call()

### pcall(ops, key, arg, ...)

alias for redis.pcall

### select(db)

* select index
```
    select(1)
```

* select dbname
`redisClient.configDBName(conf)`, then select(dbname);

```
    select('userinfo')
```

return value
* success: nil
* fail:    message

__Note__: use `select(n)` instead of `redis.call('select', n)`

### exists([db,] key)

* db is option. number(db index) or string(db config name).

for examples:

~~~
    exists('foo')
    exists(1, 'foo')
    exists('userinfo', 'foo')
~~~

return true or false

---
## JavaScirpt API

### redisClient.evalScript(scriptPack, keyCount, key1, key2 ... arg1, arg2 ...)

* scriptPack:  lua script pack; Object, return by `redisClient.sha1pack(script)` required
* keyCount:    keys's count. like node-redis's eval method. It's optional when it is zero
* key1 - keyn: keys; optional
* arg1 - argn: arguments; optional

return Promise

### redisClient.sha1pack(script)

* script: your lua scirpt, string

return object, lua script pack
```
{
    text:'lua text',
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

