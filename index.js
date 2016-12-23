var fs = require('fs');
var luaModule = require('./luaModule.js');
var packUtil = require('./packUtil.js');
var execUtil = require('./execUtil.js');

var globalPack = fs.readFileSync(__dirname+'/lib/global.lua', 'utf8');

function injectFunction(redisClient) {
    redisClient.evalScript = execUtil.evalScript.bind(redisClient);
    redisClient.sha1pack = packUtil.sha1pack;
    redisClient.configDBName = packUtil.configDBName;

    luaModule.setRedisClient(redisClient);

    redisClient.on('ready', function() {
        //console.log('ready');
        redisClient.evalScript(globalPack);
        luaModule.reload();
    });

    return redisClient.evalScript(globalPack);
}

exports.inject = injectFunction;
