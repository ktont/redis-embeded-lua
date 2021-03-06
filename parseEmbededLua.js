const fs = require('fs');
const path = require('path');

function startsWith(base, off, sub) {
    for(var i=0; i<sub.length; i++)
        if(base[off+i] !== sub[i])
            return false;
    return true;
}

function subString(base, off) {
    var sp = [];
    var match = base[off];
    var escaseSub = '\\'+match;
    for(var i=off+1; i<base.length;) {
        if(startsWith(base, i, escaseSub)) {
            sp.push(escaseSub);
            i+=2;
            continue;
        }
        if(base[i] == match) {
            return sp.join('');
        }
        if(base[i] == '\n') {
            throw new SyntaxError('Invalid or unexpected token');
        }
        sp.push(base[i++]);
    }
    throw new SyntaxError('Invalid or unexpected token');
}

function subLine(base, off) {
    var idx = base.indexOf('\n', off); 
    if(idx === -1) {
        return base.substring(off);
    } else {
        return base.substring(off, idx);
    }
}

function replaceComment(str) {
    var matchLineFeed = false;
    var matchMutiCom2 = false;
    var matchMutiCom4 = false;
    var modules = [];
    var newStr = [];
    for(var i=0; i<str.length;) {
        //单行注释
        if(matchLineFeed) {
            if(str[i] === '\n')
                matchLineFeed = false;
            newStr.push(str[i++]);
            continue;
        }
        //多行注释
        if(matchMutiCom2) {
            if(startsWith(str, i, '*/')) {
                newStr.push(']]--'); i+=2;
                matchMutiCom2 = false;
                continue;
            }
            newStr.push(str[i++]);
            continue;
        }
        if(matchMutiCom4) {
            if(startsWith(str, i, ']]--')) {
                newStr.push(']]--');
                i+=4;
                matchMutiCom4 = false;
                continue;
            }
            newStr.push(str[i++]);
            continue;
        }

        //--------------------------------//
        if(str[i]=="'" || str[i]=='"') {
            var sub = subString(str, i);
            newStr.push(str[i]+sub+str[i]);
            i+=sub.length+2;
            continue;
        }

        //注意不能发在判断单行注释之后，因为 --, --[[会冲突
        if(startsWith(str, i, '/*')) {
            newStr.push('--[[');
            i+=2;
            matchMutiCom2 = true;
            continue;
        }
        if(startsWith(str, i, '--[[')) {
            newStr.push('--[[');
            i+=4;
            matchMutiCom4 = true;
            continue;
        }

        if(startsWith(str, i, '//') || startsWith(str, i, '--')) {
            newStr.push('--');
            i+=2;
            matchLineFeed = true;
            continue;
        }

        //code
        var ret = expect_require(str, i);
        if(ret) {
            i+=ret.length;
            modules.push(ret.file);
            newStr.push(`redis.moduleCaching["${ret.file}"]`);
            continue;
        }
        newStr.push(str[i++]);
    }

    return {
        script: newStr.join(''),
        modules: modules.length && modules || undefined
    };
}

function getCallerFile() {
    try {
        throw new Error();
    } catch(e) {
        var stack = e.stack;
        var a = stack.match(/at RedisClient.sha1pack \(.*\)\n/)
        if(!a)
            throw new Error('match null, require file error');
        var b = stack.substr(a.index+a[0].length);
        if(!b)
            throw new Error('substr null, require file error');
        if(b.startsWith('    at repl:'))
            return '';
        var c = b.match(/\((.*):\d+:\d+\)/)
        if(!c)
            throw new Error('2 match null, require file error');
        return c[1];
    }
}

function handle_require(file) {
    if(file[0] == '/') {
        var absolute = path.join(file);
    } else {
        var callerFile = getCallerFile();
        var absolute = path.join(path.dirname(callerFile), file)
    }
    if(!fs.existsSync(absolute)) {
        throw new Error('file not found ' + absolute);
    }

    return absolute;
}

function expect_require(base, off) {
    if(startsWith(base, off, 'require')) {
        //if is a variable
        if(off > 0 && /\w/.test(base[off-1])) {
            /*
             +     -     *     /     %     ^     #
             &     ~     |     <<    >>    //
             ==    ~=    <=    >=    <     >     =
             (     )     {     }     [     ]     ::
             ;     :     ,     .     ..    ...
            */
            return;
        }
        var i = off + 'require'.length;
        while(/[ \t]/.test(base[i])) i++;
        if(base[i++] != '(') 
            return;
        while(/[ \t]/.test(base[i])) i++;
        if(base[i]=="'" || base[i]=='"') {
            var file = subString(base, i);
            if(!file) {
                throw new SyntaxError('require filename is empty.');
            }
            i+=file.length+2;
            while(/[ \t]/.test(base[i])) i++;
            if(base[i++] != ')')
                throw new SyntaxError('require syntax');
            var absoluteName = handle_require(file.trim());
            return {
                length: i-off,
                file: absoluteName
            };
        } else {
            throw new SyntaxError('require usage: load a lua file.');
        }
    }
}

module.exports = replaceComment;
