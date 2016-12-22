--[[
]]--
redis.moduleCaching = {}
redis.TRUE = 1
redis.FALSE = nil
redis.exists = function(key)
    if redis.call('exists', key) == redis.TRUE then
        return redis.TRUE
    end
    return nil
end
redis.select = function(db) 
    local ret = redis.pcall('select', db)
    return ret.err
end

