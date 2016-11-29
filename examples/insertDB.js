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
