local selected_db = 0
local call  = redis.call
local pcall = redis.pcall
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
local exists = function(db, ey)
    if not db then
        return false
    elseif not key then
        key = db
        db = selected_db
    end

    if type(db) == 'string' then
        if not redis._DBMAP then
            return false
        end
        db = redis._DBMAP[db]
        if not db then
            return false
        end
    end

    if db ~= selected_db then
        local r = redis.call('select', db)
        if r.err then return false end
    end
    local e = redis.call('exists', key)
    if db ~= selected_db then
        redis.call('select', selected_db)
    end
    return e == 1 and true or false
end
