redis.moduleCaching = {}
redis.exists = function(key)
    if redis.call('exists', key) == 1 then
        return true
    end
    return false
end
redis.select = function(db) 
    local ret = redis.pcall('select', db)
    return ret.err
end
redis.haha = {}
redis.haha.splitArguments = function(arg)
    local off = 1
    local fmt = arg[off]
    off = off + 1
    if not fmt or fmt == '' then
        return
    end
    local pack = {}
    for i in string.gmatch(fmt, "%S+") do
        local t = {}
        local n = 0
        table.insert(t, i)
        for k in string.gmatch(i, "%%.") do
            if k ~= '%%' then
                table.insert(t, arg[off])
                off = off + 1
                n = n + 1
            end 
        end
        if n == 0 then
            table.insert(pack, i)
        else
            table.insert(pack, string.format(unpack(t)))
        end
    end
    return pack
end
