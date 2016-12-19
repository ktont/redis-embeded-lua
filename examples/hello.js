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
