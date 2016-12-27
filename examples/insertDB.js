    var redis = require("redis"),
        redisClient = redis.createClient();
    var redisEmbededLua = require('redis-embeded-lua');

    redisEmbededLua.inject(redisClient);

    var yourBussinessInsertData = (function () {
        var pack = redisClient.sha1pack(`
            local keyExistsFlag = exists(ARGV[1])
            local userinfo = cjson.decode(ARGV[2])
            for k,v in pairs(userinfo) do
                call('hset %s %s %s', ARGV[1], k, v)
            end
            call('hset %s updateTime %s', ARGV[1], ARGV[3])
            if not keyExistsFlag then
                call('hset %s createTime %s', ARGV[1], ARGV[3])
            end
            return {'ok', keyExistsFlag and 'update '..ARGV[1] or 'insert '..ARGV[1]}
        `);
        return function(key, json) {
            return redisClient.evalScript(pack, 
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
