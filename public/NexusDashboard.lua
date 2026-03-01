--[[
    Nexus Dashboard - Server Integration Script
    Place this in ServerScriptService
    
    This script handles:
    1. Server heartbeat (sends live server + player data to your dashboard)
    2. Command processing (kick, ban, warn, announce from the dashboard)
    3. Ban checking on player join
    
    SETUP:
    - Set DASHBOARD_URL to your deployed Vercel URL
    - Set PROJECT_API_KEY to your project's API key (from dashboard settings)
    - Set PROJECT_ID to your project's ID
]]

local HttpService = game:GetService("HttpService")
local MessagingService = game:GetService("MessagingService")
local Players = game:GetService("Players")

---------------------------------------------------------------------------
-- CONFIGURATION (EDIT THESE)
---------------------------------------------------------------------------
local DASHBOARD_URL = "https://YOUR-APP.vercel.app"  -- Your dashboard URL (no trailing slash)
local PROJECT_API_KEY = "YOUR_PROJECT_API_KEY"         -- From dashboard settings
local PROJECT_ID = "YOUR_PROJECT_ID"                   -- From dashboard settings
local HEARTBEAT_INTERVAL = 15                          -- Seconds between heartbeats
---------------------------------------------------------------------------

-- Create RemoteEvents for client-side UI
local announceEvent = Instance.new("RemoteEvent")
announceEvent.Name = "DashboardAnnouncement"
announceEvent.Parent = game.ReplicatedStorage

local warnEvent = Instance.new("RemoteEvent")
warnEvent.Name = "DashboardWarning"
warnEvent.Parent = game.ReplicatedStorage

---------------------------------------------------------------------------
-- HEARTBEAT: Send live server + player data to the dashboard
---------------------------------------------------------------------------
local function getPlayerData()
    local playerList = {}
    for _, player in Players:GetPlayers() do
        local playTime = os.time() - (player:GetAttribute("JoinTime") or os.time())
        table.insert(playerList, {
            userId = tostring(player.UserId),
            displayName = player.DisplayName,
            username = player.Name,
            playTime = playTime,
            accountAge = player.AccountAge,
            avatarUrl = Players:GetUserThumbnailAsync(
                player.UserId,
                Enum.ThumbnailType.HeadShot,
                Enum.ThumbnailSize.Size100x100
            ) or "",
        })
    end
    return playerList
end

local function sendHeartbeat()
    local success, err = pcall(function()
        local serverData = {
            serverId = game.JobId,
            projectId = PROJECT_ID,
            placeId = tostring(game.PlaceId),
            players = #Players:GetPlayers(),
            maxPlayers = Players.MaxPlayers,
            fps = math.floor(1 / game:GetService("RunService").Heartbeat:Wait()),
            ping = 0,
            uptime = math.floor(workspace.DistributedGameTime),
            playerList = getPlayerData(),
        }

        HttpService:RequestAsync({
            Url = DASHBOARD_URL .. "/api/heartbeat",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["x-api-key"] = PROJECT_API_KEY,
            },
            Body = HttpService:JSONEncode(serverData),
        })
    end)

    if not success then
        warn("[Nexus] Heartbeat failed:", err)
    end
end

-- Track join time for play time calculation
Players.PlayerAdded:Connect(function(player)
    player:SetAttribute("JoinTime", os.time())
end)

-- Heartbeat loop
task.spawn(function()
    while true do
        sendHeartbeat()
        task.wait(HEARTBEAT_INTERVAL)
    end
end)

---------------------------------------------------------------------------
-- COMMANDS: Process commands from the dashboard via MessagingService
---------------------------------------------------------------------------
local function processCommand(data)
    if data.type == "kick" then
        local player = Players:GetPlayerByUserId(tonumber(data.userId))
        if player then
            player:Kick("Removed by admin: " .. (data.reason or "No reason provided"))
            print("[Nexus] Kicked", player.Name, ":", data.reason)
        end

    elseif data.type == "ban" then
        -- Kick the player immediately
        local player = Players:GetPlayerByUserId(tonumber(data.userId))
        if player then
            local banMsg = "You have been banned"
            if data.reason then
                banMsg = banMsg .. ": " .. data.reason
            end
            if data.expiresAt then
                -- Format expiry date properly
                local expiryDate = data.expiresAt
                banMsg = banMsg .. "\nExpires: " .. expiryDate
            elseif data.duration and data.duration ~= "permanent" and data.duration ~= "custom" then
                banMsg = banMsg .. " (Duration: " .. data.duration .. ")"
            elseif data.duration == "permanent" then
                banMsg = banMsg .. " (Permanent)"
            end
            player:Kick(banMsg)
            print("[Nexus] Banned", player.Name, ":", data.reason, "Duration:", data.duration)
        end

    elseif data.type == "unban" then
        -- Unban is handled server-side in the dashboard DB
        -- This message is informational only
        print("[Nexus] Unban processed for userId:", data.userId)

    elseif data.type == "warn" then
        local player = Players:GetPlayerByUserId(tonumber(data.userId))
        if player then
            warnEvent:FireClient(player, data.reason or "No reason", data.issuedBy or "Admin")
            print("[Nexus] Warned", player.Name, ":", data.reason)
        end

    elseif data.type == "announce" then
        -- If serverId specified, only broadcast to that server
        if data.serverId and data.serverId ~= "" then
            if game.JobId == data.serverId then
                announceEvent:FireAllClients(data.message, data.issuedBy or "Admin")
                print("[Nexus] Server announcement:", data.message)
            end
        else
            announceEvent:FireAllClients(data.message, data.issuedBy or "Admin")
            print("[Nexus] Global announcement:", data.message)
        end

    elseif data.type == "shutdown_server" then
        if game.JobId == data.serverId then
            print("[Nexus] Server shutdown requested by", data.issuedBy)
            for _, player in Players:GetPlayers() do
                player:Kick("Server shutdown by admin: " .. (data.reason or "Maintenance"))
            end
        end
    end
end

MessagingService:SubscribeAsync("DashboardCommands", function(message)
    local success, data = pcall(function()
        return HttpService:JSONDecode(message.Data)
    end)

    if not success then
        warn("[Nexus] Failed to decode command:", message.Data)
        return
    end

    processCommand(data)
end)

---------------------------------------------------------------------------
-- BAN CHECK: Check if a player is banned when they join
---------------------------------------------------------------------------
Players.PlayerAdded:Connect(function(player)
    local success, result = pcall(function()
        local response = HttpService:RequestAsync({
            Url = DASHBOARD_URL .. "/api/check-ban?projectId=" .. PROJECT_ID .. "&userId=" .. tostring(player.UserId),
            Method = "GET",
            Headers = {
                ["x-api-key"] = PROJECT_API_KEY,
            },
        })
        return HttpService:JSONDecode(response.Body)
    end)

    if success and result then
        if result.banned then
            local kickMsg = "You are banned from this game"
            if result.reason then
                kickMsg = kickMsg .. ": " .. result.reason
            end
            if result.expiresAt then
                kickMsg = kickMsg .. "\nExpires: " .. result.expiresAt
            end
            player:Kick(kickMsg)
            print("[Nexus] Banned player blocked:", player.Name)
        elseif result.wasUnbanned then
            print("[Nexus] unbanned -", player.Name, "(" .. player.UserId .. ")")
        end
    end
end)

---------------------------------------------------------------------------
print("[Nexus] Dashboard integration initialized")
print("[Nexus] Server ID:", game.JobId)
print("[Nexus] Heartbeat interval:", HEARTBEAT_INTERVAL, "seconds")
