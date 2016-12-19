    var redis = require("redis"),
        redisClient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');

    redisEmbededLua.inject(redisClient);

    var yourBussinessInsertData = (function () {
        var script = redisClient.sha1pack(`
            local userinfo = cjson.decode(ARGV[1])
            local keyExistsFlag = exists(KEYS[1])
            for k,v in pairs(userinfo) do
                call('hset', KEYS[1], k, v)
            end
            call('hset', KEYS[1], 'updateTime', ARGV[2])
            if not keyExistsFlag then
                call('hset', KEYS[1], 'createTime', ARGV[2])
            end
            return {'ok', keyExistsFlag and 'update '..KEYS[1] or 'insert '..KEYS[1]}
        `);
        return function(key, json) {
            return redisClient.evalScript(script, 1, 
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
