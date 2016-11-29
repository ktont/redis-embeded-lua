var crypto = require('crypto');

function sha1sum(text) {
    return crypto.createHash('sha1').update(text).digest('hex');
}
/*
 * 在redis中执行指定的脚本 参考redis的eval命令 http://www.redis.cn/commands/eval.html
 * @params
 *      script  string，必须
 *      sha1    string，可选
 *      keyCount    number,有参数时必选
 *      key1-n  string，1个或者多个key
 *      arg1-n  string，1个或者多个arg
 * @example
 *      1. evalScript(script, 1, key, arg1, arg2)
 *          执行脚本script，该脚本有一个key，两个参数
 *      2. evalScript(script)
 *          执行脚本scirpt，该脚本没有任何参数
 *      3. evalScript(script, 0, arg1, arg2)
 *          执行脚本script，该脚本没有key。但是有两个参数
 *      4. evalScript(script, sha1)
 *          执行脚本script，同时给出该脚本的sha1值。
 *          sha1是可选参数，给出sha1，有助于提升性能。
 *          特别是在脚本很长的情况下。
 *          如果脚本较短，则可以不给出sha1。
 * @return Promise
 */
function evalScript() {
    var self = this;
    var args = [].slice.call(arguments, 0);
    var script;
    if(typeof(args[1]) == 'number' || args.length == 1) {
        script = args[0];
        args[0] = sha1sum(script);
        args.length == 1 && args.push(0);
    } else if(typeof(args[2]) == 'number' || args.length == 2) {
        script = args.shift();
        args.length == 2 && args.push(0);
    } else {
        return Promise.reject(new Error('parameter invalid.'));
    }

    args.push(null);
    return new Promise(function(resolve, reject) {
        (function againAgain(retry) {
            args[args.length-1] = function(err, ret) {
                if(err && err.message.indexOf('NOSCRIPT') >=0 && !retry) {
                    return self.script('load', script, function(err, sha1) {
                        if(err) {
                            return reject(err);
                        }
                        againAgain(true);
                    });
                } else if(err) {
                    return reject(err);
                } else {
                    return resolve(ret);
                }
            }
            self.evalsha.apply(self, args);
        })(false);
    });
}

function injectFunction(redisClient) {
    redisClient.evalScript = evalScript.bind(redisClient);
    redisClient.sha1sum = sha1sum;
}

exports.bind = injectFunction;

//////////////////////////////////////
exports.sha1sum = sha1sum;

exports.evalScript = function() {
    var args = [].slice.call(arguments, 0);
    var redisClient = args.shift();
    if(typeof redisClient != 'object') {
        return Promise.reject(new Error('parameter invalid.'));
    }

    return evalScript.apply(redisClient, args);
}
