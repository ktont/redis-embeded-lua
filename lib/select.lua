local selected_db = 0
local select = function(n)
    if type(n) == 'string' and redis._DBMAP then
        n = redis._DBMAP[n]
    end
    local r = redis.pcall('select', n)
    if not r.err then
        selected_db = n
    end
    return r.err
end
local exists = function(key)
    if not key then
        return false
    end
    local r = redis.call('exists', key)
    return r == 1 and true or false
end
