node-redis-embeded-lua
==================
### 0:
~~~js
var redis = require("redis"),
    redisClient = redis.createClient();
var redisEmbededLua = require('redis-embeded-lua');

redisEmbededLua.inject(redisClient);

var pack = redisClient.sha1pack(`
    redis.call('set', 'foo', 'bar')
    return 'ok'
`);

redisClient.evalScript(pack)
.then(function(ret) {
    console.log('the result:', ret);
    redisClient.unref();
})
.catch(function(e) {
    console.error(e.toString());
    process.exit(1);
});

~~~
~~~bash
$ npm install redis-embeded-lua
$ vi test.js
$ node ./test.js
the result: ok
~~~

### 1: promotion
~~~js
var pack = redisClient.sha1pack(`
    /*
     * Yes! Comment here like JS
     */
    redis.call('set', 'foo', 'bar')
    return 'ok'
`);
~~~

### 2: promotion
~~~js
var pack = redisClient.sha1pack(`
    /*
     * the ARGV is a string array.
     * SEE ALSO: examples/insertDB.js
     */
    redis.call('set', ARGV[1], ARGV[2])
    return 'ok'
`);

redisClient.evalScript(pack, 'foo', 'bar')
.then(function(ret) {
    console.log('the result:', ret);
    redisClient.unref();
})
.catch(function(e) {
    console.error(e.toString());
    process.exit(1);
});
~~~

### 3: promotion
~~~js
var pack = redisClient.sha1pack(`
    /*
     *  the method 'call':
     *    the same rules as the printf family of standard C functions
     *    SEE ALSO, string.format(fmt, ...)
     *  yes! there are another function 'pcall' as redis.pcall
     */
    call('set foo bar_%s', 'hello world')
    return call('get foo')
`);
~~~

~~~bash
$ vi test.js
$ node ./test.js
the result: bar_hello world
~~~

### 4: promotion
~~~lua
exports.PI = 3.14
exports.mul = function(a,b)
    return a*b
end
~~~
~~~js
var pack = redisClient.sha1pack(`
    local mathDemo = require('./mathDemo.lua')
    call('set radius 9')
    local radius = call('get radius')
    //area = radius * radius * PI
    return mathDemo.mul(radius*radius, mathDemo.PI)
`);
~~~
~~~bash
$ vi mathDemo.lua
$ vi test.js
$ node ./test.js
the result: 254
~~~

### 5: promotion
~~~js
var redis = require("redis"),
    redisClient = redis.createClient();
var redisEmbededLua = require('redis-embeded-lua');

redisEmbededLua.inject(redisClient);

/*
 * Actually, ``evalScript'' must be called in a closure;
 * because, performance of ``sha1pack'' is expensive
 * Yes, `run bussiness in closure' is the `original intention'.
 */
var yourBussinessDBCount = (function() {
    var pack = redisClient.sha1pack(`
        local r = call('keys *')
        local count = 0
        for k,v in ipairs(r) do
            count = count + 1
        end
        return 'the dbsize: '..count
    `);
    return function() {
        return redisClient.evalScript(pack);
    }
})();

yourBussinessDBCount()
.then(function(ret) {
    console.log(ret);
    redisClient.unref();
})
.catch(function(e) {
    console.error(e.toString());
    process.exit(1);
});
~~~
~~~bash
$ vi test.js
$ node ./test.js
the dbsize: 9
~~~
maybe different from your system.

### 6: promotion
__TIP__: If you use only one db in redis, ignore this section.
~~~js
/*
 * I don't like the multi-db design of redis.
 * so, recommend you use only one db.
 */
redisClient.configDBName({
    0:  'DEFAULT',
    1:  'USERINFO',
    11: 'STATICS',
    15: 'TEST'
});
var pack = redisClient.sha1pack(`
    local t = {}
    select('TEST')
    table.insert(t, call('dbsize'))
    select('STATICS')
    table.insert(t, call('dbsize'))
    //certainly, you can use db number directly
    select(1)
    table.insert(t, call('dbsize'))
    return 'ok'
`);
~~~
~~~bash
$ vi test.js
$ node test.js
[ 1, 1, 3 ]
~~~
maybe different from your system.

## Installation
`npm install redis-embeded-lua`

## Usage
~~~js
class YourBussiness() {
    constructor(redisClient) {
        this.client = redisClient;
        redisEmbededLua.inject(this.client);
    }
}
YourBussiness.prototype.set = (function() {
    var script = redisClient.sha1pack(`
        call("set %s %s", ARGS[1], ARGS[2])
        return
    `);
    return function(key, val) {
        return this.client.evalScript(script, key, val);
    };
})();

YourBussiness.prototype.get = (function() {
    var script = redisClient.sha1pack(`
        return call('get %s', ARGS[1])
    `);
    return function(key) {
        return this.client.evalScript(script, key);
    };
})();
~~~
---
## LUA API

### require('file')

require like nodejs. Only support one level(and in embeded lua).

### call(fmt, ...)

printf(3) + redis.call + redis-cli

### pcall(fmt, ...)

printf(3) + redis.pcall + redis-cli

### select(db)

* select index
```
    select(1)
```

* select dbname
`redisClient.configDBName(conf)`, then select(dbname);

```
    select('USERINFO')
```

return value
* success: nil
* fail:    message

### exists(key)

for examples:
~~~
    exists('foo')
~~~

return true or false

rahter than the following
~~~lua
if redis.call('exists', 'foo') == 1 then
    return true
else
    return false
end
~~~

---
## JavaScirpt API

### redisClient.evalScript(pack, arg1, arg2 ...)

* pack: object, return by `redisClient.sha1pack(script)`. required
* arg1 - argn: arguments. optional

return Promise

### redisClient.sha1pack(script)

* script: lua scirpt, string

return object
```JSON
{
    text:'lua text',
    sha1:'sha1num'
}
```

### redisClient.configDBName(conf)

* conf object
```JSON
{
    0: 'DEFAULT',
    1: 'USERINFO'
}
```
