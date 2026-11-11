-- Scuba Simulator private operations relay
-- Install as a Script in ServerScriptService. Paste the three private settings from
-- Dashboard > Private settings. Never put the relay key in a LocalScript or ReplicatedStorage.

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local MessagingService = game:GetService("MessagingService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

-- Replace these values from Dashboard > Private settings > In-game relay.
local DASHBOARD_URL = "https://YOUR-DEPLOYED-DASHBOARD"
local PROJECT_ID = "a4197d57-741b-4cac-916b-5260bd511560"
local PROJECT_RELAY_KEY = "PASTE_RELAY_KEY_FROM_PRIVATE_SETTINGS"

local EXPECTED_PLACE_ID = 139373122825390
local HEARTBEAT_SECONDS = 15
local COMMAND_TOPIC = "DashboardCommands"
local BASE_URL = DASHBOARD_URL:gsub("/+$", "")

if game.PlaceId ~= EXPECTED_PLACE_ID then
  warn("[Scuba Ops] This script is configured for place " .. EXPECTED_PLACE_ID .. "; current place is " .. game.PlaceId)
  return
end

if DASHBOARD_URL:find("YOUR%-DEPLOYED%-DASHBOARD") or PROJECT_RELAY_KEY:find("PASTE_RELAY_KEY") then
  warn("[Scuba Ops] Open Private settings in the owner dashboard and paste the generated server settings into this script.")
  return
end

local serverId = game.JobId
if serverId == "" then
  warn("[Scuba Ops] Relay telemetry only runs in live game servers, not Studio sessions.")
  return
end

local function getOrCreateRemote(name)
  local existing = ReplicatedStorage:FindFirstChild(name)
  if existing and existing:IsA("RemoteEvent") then
    return existing
  end

  local remote = Instance.new("RemoteEvent")
  remote.Name = name
  remote.Parent = ReplicatedStorage
  return remote
end

local announcementRemote = getOrCreateRemote("NexusDashboardAnnouncement")
local warningRemote = getOrCreateRemote("NexusDashboardWarning")
local joinedAt = {}
local frameCount = 0
local frameWindowStarted = os.clock()
local measuredFps = 60

RunService.Heartbeat:Connect(function()
  frameCount += 1
  local now = os.clock()
  local elapsed = now - frameWindowStarted
  if elapsed >= 2 then
    measuredFps = frameCount / elapsed
    frameCount = 0
    frameWindowStarted = now
  end
end)

local function requestJson(method, path, payload)
  local options = {
    Url = BASE_URL .. path,
    Method = method,
    Headers = {
      ["x-api-key"] = PROJECT_RELAY_KEY,
      ["Content-Type"] = "application/json",
    },
  }

  if payload then
    options.Body = HttpService:JSONEncode(payload)
  end

  local ok, response = pcall(function()
    return HttpService:RequestAsync(options)
  end)

  if not ok then
    return nil, tostring(response)
  end
  if not response.Success then
    return nil, "HTTP " .. tostring(response.StatusCode)
  end
  return response, nil
end

local function postWithRetry(path, payload)
  for attempt = 1, 3 do
    local response, err = requestJson("POST", path, payload)
    if response then
      return true
    end
    if attempt < 3 then
      task.wait(attempt)
    else
      warn("[Scuba Ops] Relay request failed at " .. path .. ": " .. tostring(err))
    end
  end
  return false
end

local function getPlayerSnapshot()
  local playerList = {}
  local pingTotal = 0
  local pingCount = 0
  local now = os.time()

  for _, player in ipairs(Players:GetPlayers()) do
    local pingOk, pingSeconds = pcall(function()
      return player:GetNetworkPing()
    end)
    if pingOk and type(pingSeconds) == "number" then
      pingTotal += pingSeconds * 1000
      pingCount += 1
    end

    playerList[#playerList + 1] = {
      userId = player.UserId,
      username = player.Name,
      displayName = player.DisplayName,
      accountAge = player.AccountAge,
      playTime = math.max(0, now - (joinedAt[player.UserId] or now)),
    }
  end

  local averagePing = pingCount > 0 and math.floor(pingTotal / pingCount + 0.5) or 0
  return playerList, averagePing
end

local function sendHeartbeat()
  local playerList, averagePing = getPlayerSnapshot()
  local ok = postWithRetry("/api/relay/heartbeat", {
    projectId = PROJECT_ID,
    serverId = serverId,
    placeId = game.PlaceId,
    players = #playerList,
    maxPlayers = Players.MaxPlayers,
    fps = math.floor(measuredFps + 0.5),
    ping = averagePing,
    uptime = math.floor(workspace.DistributedGameTime),
    playerList = playerList,
  })
  return ok
end

local function checkBan(player)
  local url = string.format("%s/api/check-ban?projectId=%s&userId=%s", BASE_URL, PROJECT_ID, player.UserId)
  for attempt = 1, 3 do
    local ok, response = pcall(function()
      return HttpService:RequestAsync({
        Url = url,
        Method = "GET",
        Headers = { ["x-api-key"] = PROJECT_RELAY_KEY },
      })
    end)

    if ok and response.Success then
      local decodedOk, result = pcall(function()
        return HttpService:JSONDecode(response.Body)
      end)
      if decodedOk and result.banned and player.Parent == Players then
        local ban = result.ban or result
        local reason = ban.reason or "Access to this experience is restricted."
        player:Kick("You are banned from this experience. Reason: " .. tostring(reason))
      end
      return
    end

    if ok and response.StatusCode >= 400 and response.StatusCode < 500 then
      warn("[Scuba Ops] Ban check rejected for user " .. player.UserId .. " (HTTP " .. response.StatusCode .. ")")
      return
    end
    if attempt < 3 then
      task.wait(attempt)
    end
  end
  warn("[Scuba Ops] Ban check unavailable for user " .. player.UserId .. "; allowing join while the dashboard is unreachable.")
end

local function trackPlayer(player)
  if joinedAt[player.UserId] then
    return
  end
  joinedAt[player.UserId] = os.time()

  task.spawn(function()
    postWithRetry("/api/relay/join", {
      projectId = PROJECT_ID,
      serverId = serverId,
      placeId = game.PlaceId,
      userId = player.UserId,
      username = player.Name,
      displayName = player.DisplayName,
      accountAge = player.AccountAge,
    })
  end)
  task.spawn(checkBan, player)
  task.delay(0.25, sendHeartbeat)
end

Players.PlayerAdded:Connect(trackPlayer)
Players.PlayerRemoving:Connect(function(player)
  task.spawn(function()
    postWithRetry("/api/relay/leave", {
      projectId = PROJECT_ID,
      serverId = serverId,
      userId = player.UserId,
    })
    joinedAt[player.UserId] = nil
    task.wait(0.25)
    sendHeartbeat()
  end)
end)

local function findPlayer(userId)
  local target = tonumber(userId)
  if not target then
    return nil
  end
  for _, player in ipairs(Players:GetPlayers()) do
    if player.UserId == target then
      return player
    end
  end
  return nil
end

local function handleCommand(raw)
  local ok, command = pcall(function()
    if type(raw) == "string" then
      return HttpService:JSONDecode(raw)
    end
    return raw
  end)
  if not ok or type(command) ~= "table" then
    warn("[Scuba Ops] Ignored an invalid dashboard command.")
    return
  end

  local commandType = tostring(command.type or "")
  local message = tostring(command.message or "")
  local issuedBy = tostring(command.issuedBy or "Owner")
  local targetUserId = command.userId or command.targetUserId or command.playerId

  if commandType == "announce" then
    announcementRemote:FireAllClients(message, issuedBy)
  elseif commandType == "warn" then
    if targetUserId then
      local target = findPlayer(targetUserId)
      if target then warningRemote:FireClient(target, message, issuedBy) end
    else
      for _, player in ipairs(Players:GetPlayers()) do
        warningRemote:FireClient(player, message, issuedBy)
      end
    end
  elseif commandType == "kick" or commandType == "ban" then
    local target = findPlayer(targetUserId)
    if target then
      target:Kick(message ~= "" and message or "Removed by the game owner.")
    end
  elseif commandType == "shutdown_server" or commandType == "shutdown_all" then
    if commandType == "shutdown_all" or command.serverId == serverId then
      local reason = message ~= "" and message or "The game owner is restarting servers. Please rejoin shortly."
      for _, player in ipairs(Players:GetPlayers()) do
        player:Kick(reason)
      end
    end
  end
end

local subscribeOk, subscribeResult = pcall(function()
  return MessagingService:SubscribeAsync(COMMAND_TOPIC, function(message)
    handleCommand(message.Data)
  end)
end)
if not subscribeOk then
  warn("[Scuba Ops] Could not subscribe to dashboard commands: " .. tostring(subscribeResult))
end

for _, player in ipairs(Players:GetPlayers()) do
  trackPlayer(player)
end

task.spawn(function()
  task.wait(2)
  sendHeartbeat()
  while task.wait(HEARTBEAT_SECONDS) do
    sendHeartbeat()
  end
end)
