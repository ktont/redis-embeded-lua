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
