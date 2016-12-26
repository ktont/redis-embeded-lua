local call = function(cmd)
    if cmd == nil or cmd == '' then
        return
    end
    local t = {}
    for i in string.gmatch(cmd, "%S+") do
        table.insert(t, i)
    end
    return redis.call(unpack(t))
end
local pcall = function(cmd)
    if cmd == nil or cmd == '' then
        return
    end
    local t = {}
    for i in string.gmatch(cmd, "%S+") do
        table.insert(t, i)
    end
    return redis.pcall(unpack(t))
end