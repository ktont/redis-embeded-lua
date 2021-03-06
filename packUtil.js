var fs = require('fs');
var crypto = require('crypto');
var parseEmbededLua = require('./parseEmbededLua.js');
var selectLua = fs.readFileSync(__dirname+'/lib/select.lua', 'utf8');
var callLua = fs.readFileSync(__dirname+'/lib/call.lua', 'utf8');
var luaModule = require('./luaModule.js');

var dbMap = '';

function sha1pack(text) {
    var ext = parseEmbededLua(text);
    var text = [
        dbMap,
        selectLua,
        callLua,
        'local function _()',
            ext.script,
        'end',
        'return _()'
    ].join('\n');
    var sha1 = crypto.createHash('sha1').update(text).digest('hex');
    if(ext.modules) {
        luaModule.load(ext.modules);
    }
    var result = {
        text: text,
        sha1: sha1
    };
    if(ext.modules) result._modules_ = ext.modules;
    return result;
}

function configDBName(conf) {
    var arr = [];
    for(var k in conf) {
        arr.push(`["${k}"] = ${conf[k]}`);
    }

    dbMap = 'redis._DBMAP = {' + arr.join(',') + '}';
    return;
}

exports.sha1pack = sha1pack;
exports.configDBName = configDBName;
