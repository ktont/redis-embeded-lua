node-redis-embeded-lua
==================
~~~lua
exports.PI = 3.14
exports.mul = function(a,b)
    return a*b
end
~~~
~~~js
var redis = require("redis"),
    redisClient = redis.createClient();
var redisEmbededLua = require('redis-embeded-lua');

redisEmbededLua.inject(redisClient);

var pack = redisClient.sha1pack(`
    local mathDemo = require('./mathDemo.lua')
    call('set radius 5')
    local radius = call('get radius')
    /*
     * area = pi * radius * radius
     */
    return mathDemo.mul(radius*radius, mathDemo.PI)
`);

redisClient.evalScript(pack)
.then(function(ret) {
    console.log('the area:', ret);
    redisClient.del('radius');
    redisClient.unref();
})
.catch(function(e) {
    console.error(e.toString());
    process.exit(1);
});
~~~
~~~bash
$ npm install redis-embeded-lua
$ vi mathDemo.lua
$ vi test.js
$ node ./test.js
the area: 78
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
            0:  'DEFAULT',
            1:  'USERINFO',
            11: 'STATICS
        });
    }
}
YourBussiness.prototype.set = (function() {
    var script = redisClient.sha1pack(`
        select('STATICS')
        redis.call('incr', 'set'..ARGS[1]);
        select('USERINFO')
        redis.call('set', ARGS[1], ARGS[2]);
    `);
    return function(key, val) {
        return this.client.evalScript(script, key, val);
    };
})();

YourBussiness.prototype.get = (function() {
    var script = redisClient.sha1pack(`
        select('STATICS')
        redis.call('incr', 'get'..ARGS[1]);
        select('USERINFO')
        return call('get', ARGS[1])
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

### call(cmd)

redis.call cmd, like redis-cli command

### pcall(cmd)

redis.pcall cmd, like redis-cli command

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

---
## JavaScirpt API

### redisClient.evalScript(pack, arg1, arg2 ...)

* pack: object, return by `redisClient.sha1pack(script)`. required
* arg1 - argn: arguments. optional

return Promise

### redisClient.sha1pack(script)

* script: lua scirpt, string

return object
```
{
    text:'lua text',
    sha1:'sha1num'
}
```

### redisClient.configDBName(conf)

* conf 
object
```
{
    0: 'DEFAULT',
    1: 'USERINFO'
}
```

