var script = `
    local r = redis.call('keys', '*')
     local count = 0
     for k,v in ipairs(r) do
         //this lua function added by me. It's new.
         if redis.exists(k) then
             count = count + 1
         end
     end
    /**/
     return count
 `;

function replaceComment(str) {
    var matchQuote = '';
    var matchLineFeed = '';
    var matchMutiCom = false;
    var newStr = [];
    for(var i=0; i<str.length;i++) {
        if(i==0) {
            newStr.push(str[i]);
            continue;
        }

        if(matchLineFeed) {
            if(matchLineFeed == str[i])
                matchLineFeed = '';
            newStr.push(str[i]);
            continue;
        }

        if(matchMutiCom) {
            if(str[i]=='/' && str[i-1]=='*') {
                newStr.pop();
                newStr.push(']');
                newStr.push(']');
                newStr.push('-');
                newStr.push('-');
                matchMutiCom = false;
                continue;
            }
            newStr.push(str[i]);
            continue;
        }

        if(matchQuote) {
            if(matchQuote == str[i])
                matchQuote = '';
            newStr.push(str[i]);
            continue;
        }
        if(str[i]=="'" || str[i]=='"') {
            matchQuote = str[i];
            newStr.push(str[i]);
            continue;
        }

        if((str[i]=='/' && str[i-1]=='/')
         ||(str[i]=='-' && str[i-1]=='-')) {
            str[i] = str[i-1] = '-';
            newStr.pop();
            newStr.push('-');
            newStr.push('-');
            matchLineFeed = '\n';
            continue;
        }

        if(str[i-1]=='*' && str[i-2]=='/') {
            newStr.pop();
            newStr.pop();
            newStr.push('-');
            newStr.push('-');
            newStr.push('[');
            newStr.push('[');
            newStr.push(str[i]);
            matchMutiCom = true;
            continue;
        }
        newStr.push(str[i]);
    }

    return newStr.join('');
}

//console.log(replaceComment(script));
module.exports = replaceComment;

