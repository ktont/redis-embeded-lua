exports.FS = '\n'

exports.printf = function(...) 
    return 'printf'
end

exports.print = function(...)
    local msg = ""
    for i,v in ipairs(arg) do
       msg = msg .. tostring(v) .. " "
    end
    -- msg = msg .. "\n"
    return msg
end
