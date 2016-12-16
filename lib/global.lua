redis.TRUE = 1
redis.FALSE = nil
--[[
不能得到当前db
redis.exists = function(db, key)
    if not key then
        key = db
    end
    if redis.call('exists', key) == redis.TRUE then
        return redis.TRUE
    end
    return nil
end
]]--
redis.exists = function(key)
    if redis.call('exists', key) == redis.TRUE then
        return redis.TRUE
    end
    return nil
end
redis.select = function(db) 
    return redis.pcall('select', db)
end

