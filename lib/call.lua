local call = function(...)
    local t = redis.haha.splitArguments(arg)
    if not t then
        return
    end
    return redis.call(unpack(t))
end

local pcall = function(cmd)
    local t = redis.haha.splitArguments(arg)
    if not t then
        return
    end
    return redis.pcall(unpack(t))
end
