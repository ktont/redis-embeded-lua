var redis = require("redis"),
    redisClient = redis.createClient();
var redisEmbededLua = require('redis-embeded-lua');

redisEmbededLua.bind(redisClient);

var yourBussinessDBAudit = (function() {
    var script = [
        "local result = {}",
        "for i = 0, 16 do",
            /*
             * pcall, return [Error: ERR invalid DB index], if
             * the db not exists.
             */
            "local r = redis.pcall('select', i)",
            "if r.err then",
                "return result",
            "end",
            "local r = redis.call('keys', '*')",
            "local tmp = {}",
            "for k,v in ipairs(r) do",
                "local ty = redis.call('type', v)['ok']", 
                "if not tmp[ty] then tmp[ty] = 0; end",
                "tmp[ty] = tmp[ty] + 1",
            "end",
            "local lst = {}",
            "for k,v in pairs(tmp) do",
                "table.insert(lst, k)",
                "table.insert(lst, v)",
            "end",
            "table.insert(result, lst)",
        "end",
        "return result"
    ].join('\n');
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
