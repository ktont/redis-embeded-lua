var fs = require('fs');
/*
 {
    file: {content,sha1},
    file: {content,sha1}
    ...
 }
 */
var moduleMap = {};
var redisClient = null;

exports.set = set;
exports.get = get;
exports.load = load;
exports.reload = reload;
exports.setRedisClient = setRedisClient;
exports.waitAllPending = waitAllPending;

function waitAllPending(lst) {
    return new Promise(function(resolve, reject) {
        (function scan(n) {
            if(n >= lst.length)
                return resolve();
            if(!moduleMap[lst[n]]) {
                return reject(new Error('require not found '+lst[n]));
            }
            waitFor(moduleMap[lst[n]])
            .then(function() {
                return scan(n+1);
            })
            .catch(function(err) {
                return reject(err);
            });
        })(0);
    });
}

function waitFor(item) {
    return new Promise(function(resolve, reject) {
        (function scan(n) {
            if(n > 10) {
                return reject(new Error('require timeout'));
            }
            //console.log('-------', item.status);
            if(item.status == 'pending')
                return setTimeout(scan, 50, n+1);
            else if(item.status == 'rejected')
                return reject(new Error('require fail'));
            else
                return resolve();
        })(0);
    });
}

function get(file) {
    return moduleMap[file];
}

function set(file, content) {
    var item = {
        content,
        status: 'pending',
    }
    moduleMap[file] = item;
    return item;
}

function setRedisClient(client) {
    redisClient = client;
}

function load(modules) {
    modules.forEach(function(file) {
        if(get(file))
            return result.push('cache');
        var str = fs.readFileSync(file, 'utf8');
        var cont= `
            local exports = {}
            ${str}
            redis.moduleCaching["${file}"] = exports
        `;
    
        var item = set(file, cont);
        redisClient.evalScript(cont)
        .then(function() {
            item.status = 'resolved';
        })
        .catch(function(e) {
            item.status = 'rejected';
        });
    });
}

/*
function load(modules) {
    return new Promise(function(resolve, reject) {
        var result = [];
        result.push = function() {
            Array.prototype.push.apply(result, arguments);
            if(this.length >= modules.length) {
                resolve();
            }
        };
        modules.forEach(function(x) {
            if(get(x.file))
                return result.push('cache');
            var str = fs.readFileSync(x.file, 'utf8');
            var cont= `
                local exports = {}
                ${str}
                redis.moduleCaching["${x.file}"] = exports
            `;
            (function (file, cont) {
                redisClient.evalScript(cont)
                .then(function(r) {
                    set(file, cont);
                    result.push('success');
                })
                .catch(function(err) {
                    result.push('fail');
                });
            })(x.file, cont);
        });
    });
}
*/

function reload() {
    for(var k in moduleMap) {
        var x = moduleMap[k];
        x.status = 'pending';
        redisClient.evalScript(x.content)
        .then(function() {
            x.status = 'resolved'; 
        })
        .catch(function() {
            x.status = 'rejected'; 
        });
    }
}
