/*
 {
    file: {content,sha1},
    file: {content,sha1}
    ...
 }
 */
var moduleMap = {};

exports.set = set;
exports.get = get;
exports.loadModules = loadModules;
exports.reload = reload;

function get(file) {
    return moduleMap[file];
}

function set(file, content) {
    moduleMap[file] = content;
}

function loadModules(client, modules) {
    return new Promise(function(resolve, reject) {
        (function scan() {
            var file = modules.shift();
            if(!file)
                return resolve();
            if(get(file))
                return scan();
            var str = fs.readFileSync(file, 'utf8');
            var cont= `
                local exports = {}
                ${str},
                redis.moduleCaching["${file}"] = exports
            `;
            client.script('load', cont, function(err, sha1) {
                if(err)
                    return reject(err);
                client.evalsha(sha1, 0, function(err, ret) {
                    if(err)
                        return reject(err);
                    set(file, cont);
                    scan();
                });
            });
        })();
    });
}

function reload() {
    for(var file in moduleMap) {
        var ref = moduleMap[file];
        redisClient.evalScript(ref.content, ref.sha1);
    }
}

