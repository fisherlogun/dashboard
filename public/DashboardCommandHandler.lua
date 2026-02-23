--[[
	DashboardCommandHandler.lua
	Place this Script in ServerScriptService.
	
	Handles all commands sent from the web dashboard via MessagingService:
	- kick: Kicks a player with a reason
	- ban: Bans a player using Roblox's Ban API (Players:BanAsync)
	- unban: Unbans a player using Roblox's Ban API (Players:UnbanAsync)
	- warn: Shows a warning GUI to a player
	- announce: Shows an announcement to all players (or a specific server)
	- shutdown_server: Shuts down a specific server
	
	All commands are received on the "DashboardCommands" topic.
]]

local Players = game:GetService("Players")
local MessagingService = game:GetService("MessagingService")
local HttpService = game:GetService("HttpService")
local StarterGui = game:GetService("StarterGui")

local TOPIC = "DashboardCommands"

--------------------------------------------------------------------------------
-- Utility: Find a player by UserId (string or number)
--------------------------------------------------------------------------------
local function getPlayerByUserId(userId)
	local numericId = tonumber(userId)
	if not numericId then return nil end
	for _, player in ipairs(Players:GetPlayers()) do
		if player.UserId == numericId then
			return player
		end
	end
	return nil
end

--------------------------------------------------------------------------------
-- Utility: Create a simple notification ScreenGui for a player
--------------------------------------------------------------------------------
local function showNotification(player, title, message, duration, color)
	duration = duration or 8
	color = color or Color3.fromRGB(255, 170, 0)

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "DashboardNotification"
	screenGui.ResetOnSpawn = false
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

	local frame = Instance.new("Frame")
	frame.Name = "NotifFrame"
	frame.Size = UDim2.new(0, 420, 0, 0) -- height auto
	frame.Position = UDim2.new(0.5, -210, 0, 20)
	frame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
	frame.BorderSizePixel = 0
	frame.AutomaticSize = Enum.AutomaticSize.Y
	frame.Parent = screenGui

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 8)
	corner.Parent = frame

	local stroke = Instance.new("UIStroke")
	stroke.Color = color
	stroke.Thickness = 2
	stroke.Parent = frame

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, 16)
	padding.PaddingBottom = UDim.new(0, 16)
	padding.PaddingLeft = UDim.new(0, 16)
	padding.PaddingRight = UDim.new(0, 16)
	padding.Parent = frame

	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, 8)
	layout.Parent = frame

	local titleLabel = Instance.new("TextLabel")
	titleLabel.Name = "Title"
	titleLabel.Size = UDim2.new(1, 0, 0, 0)
	titleLabel.AutomaticSize = Enum.AutomaticSize.Y
	titleLabel.BackgroundTransparency = 1
	titleLabel.Text = title
	titleLabel.TextColor3 = color
	titleLabel.Font = Enum.Font.GothamBold
	titleLabel.TextSize = 16
	titleLabel.TextXAlignment = Enum.TextXAlignment.Left
	titleLabel.TextWrapped = true
	titleLabel.LayoutOrder = 1
	titleLabel.Parent = frame

	local bodyLabel = Instance.new("TextLabel")
	bodyLabel.Name = "Body"
	bodyLabel.Size = UDim2.new(1, 0, 0, 0)
	bodyLabel.AutomaticSize = Enum.AutomaticSize.Y
	bodyLabel.BackgroundTransparency = 1
	bodyLabel.Text = message
	bodyLabel.TextColor3 = Color3.fromRGB(220, 220, 220)
	bodyLabel.Font = Enum.Font.Gotham
	bodyLabel.TextSize = 14
	bodyLabel.TextXAlignment = Enum.TextXAlignment.Left
	bodyLabel.TextWrapped = true
	bodyLabel.LayoutOrder = 2
	bodyLabel.Parent = frame

	screenGui.Parent = player:FindFirstChild("PlayerGui")

	-- Auto-remove after duration
	task.delay(duration, function()
		if screenGui and screenGui.Parent then
			screenGui:Destroy()
		end
	end)
end

--------------------------------------------------------------------------------
-- Command Handlers
--------------------------------------------------------------------------------

local CommandHandlers = {}

-- KICK
function CommandHandlers.kick(data)
	local player = getPlayerByUserId(data.userId)
	if not player then
		warn("[Dashboard] Kick: Player " .. tostring(data.userId) .. " not in server")
		return
	end

	local reason = data.reason or "No reason provided"
	local issuedBy = data.issuedBy or "Dashboard"

	player:Kick(
		"\n[Dashboard Kick]\n" ..
		"Kicked by: " .. issuedBy .. "\n" ..
		"Reason: " .. reason
	)

	print("[Dashboard] Kicked player " .. player.Name .. " (ID: " .. player.UserId .. ") - Reason: " .. reason)
end

-- BAN (uses Roblox's Ban API)
function CommandHandlers.ban(data)
	local userId = tonumber(data.userId)
	if not userId then
		warn("[Dashboard] Ban: Invalid userId " .. tostring(data.userId))
		return
	end

	local reason = data.reason or "No reason provided"
	local privateReason = data.privateReason or reason
	local durationSeconds = data.durationSeconds -- nil = permanent
	local issuedBy = data.issuedBy or "Dashboard"

	-- Build ban config
	local banConfig = {
		UserIds = {userId},
		DisplayReason = reason,
		PrivateReason = privateReason,
		ExcludeAltAccounts = false,
		ApplyToUniverse = true,
	}

	-- If durationSeconds is provided and > 0, set duration; otherwise permanent
	if durationSeconds and durationSeconds > 0 then
		banConfig.Duration = durationSeconds
	end
	-- If Duration is not set, it's a permanent ban

	local success, err = pcall(function()
		Players:BanAsync(banConfig)
	end)

	if success then
		print("[Dashboard] Banned user " .. tostring(userId) .. " by " .. issuedBy .. " - Duration: " .. (durationSeconds and (durationSeconds .. "s") or "permanent") .. " - Reason: " .. reason)
	else
		warn("[Dashboard] Ban failed for user " .. tostring(userId) .. ": " .. tostring(err))
	end

	-- Also kick them if they're currently in the server (BanAsync may not instantly kick)
	local player = getPlayerByUserId(data.userId)
	if player then
		player:Kick(
			"\n[Banned]\n" ..
			"Reason: " .. reason .. "\n" ..
			"Banned by: " .. issuedBy
		)
	end
end

-- UNBAN (uses Roblox's Unban API)
function CommandHandlers.unban(data)
	local userId = tonumber(data.userId)
	if not userId then
		warn("[Dashboard] Unban: Invalid userId " .. tostring(data.userId))
		return
	end

	local issuedBy = data.issuedBy or "Dashboard"

	local unbanConfig = {
		UserIds = {userId},
		ApplyToUniverse = true,
	}

	local success, err = pcall(function()
		Players:UnbanAsync(unbanConfig)
	end)

	if success then
		print("[Dashboard] Unbanned user " .. tostring(userId) .. " by " .. issuedBy)
	else
		warn("[Dashboard] Unban failed for user " .. tostring(userId) .. ": " .. tostring(err))
	end
end

-- WARN
function CommandHandlers.warn(data)
	local player = getPlayerByUserId(data.userId)
	if not player then
		warn("[Dashboard] Warn: Player " .. tostring(data.userId) .. " not in server")
		return
	end

	local reason = data.reason or "No reason provided"
	local issuedBy = data.issuedBy or "Dashboard"

	showNotification(
		player,
		"WARNING",
		"You have been warned by " .. issuedBy .. ".\n\nReason: " .. reason,
		15,
		Color3.fromRGB(255, 85, 85) -- red warning color
	)

	print("[Dashboard] Warned player " .. player.Name .. " (ID: " .. player.UserId .. ") - Reason: " .. reason)
end

-- ANNOUNCE
function CommandHandlers.announce(data)
	local message = data.message or ""
	local issuedBy = data.issuedBy or "Dashboard"
	local targetServerId = data.serverId

	-- If serverId is specified, only show on that server
	if targetServerId and targetServerId ~= "" and targetServerId ~= game.JobId then
		return -- not this server
	end

	for _, player in ipairs(Players:GetPlayers()) do
		showNotification(
			player,
			"ANNOUNCEMENT",
			message .. "\n\n- " .. issuedBy,
			12,
			Color3.fromRGB(59, 130, 246) -- blue announcement color
		)
	end

	print("[Dashboard] Announcement by " .. issuedBy .. ": " .. message)
end

-- SHUTDOWN SERVER
function CommandHandlers.shutdown_server(data)
	local targetServerId = data.serverId

	if targetServerId and targetServerId ~= game.JobId then
		return -- not this server
	end

	local issuedBy = data.issuedBy or "Dashboard"
	print("[Dashboard] Server shutdown initiated by " .. issuedBy)

	-- Notify all players before shutdown
	for _, player in ipairs(Players:GetPlayers()) do
		showNotification(
			player,
			"SERVER SHUTDOWN",
			"This server is being shut down by " .. issuedBy .. ".\nYou will be disconnected in 5 seconds.",
			5,
			Color3.fromRGB(239, 68, 68) -- red
		)
	end

	-- Wait then kick everyone
	task.delay(5, function()
		for _, player in ipairs(Players:GetPlayers()) do
			player:Kick("\n[Server Shutdown]\nThis server was shut down by " .. issuedBy .. ".")
		end

		-- Close the server after a brief delay
		task.delay(1, function()
			-- Teleport remaining players out or just let the server close naturally
			-- when all players are kicked the server shuts down automatically
		end)
	end)
end

--------------------------------------------------------------------------------
-- Subscribe to MessagingService
--------------------------------------------------------------------------------
local function onMessageReceived(messageData)
	local rawMessage = messageData.Data

	local success, data = pcall(function()
		return HttpService:JSONDecode(rawMessage)
	end)

	if not success or type(data) ~= "table" then
		warn("[Dashboard] Failed to decode message: " .. tostring(rawMessage))
		return
	end

	local commandType = data.type
	if not commandType then
		warn("[Dashboard] Message missing 'type' field")
		return
	end

	local handler = CommandHandlers[commandType]
	if handler then
		local handlerSuccess, handlerErr = pcall(handler, data)
		if not handlerSuccess then
			warn("[Dashboard] Error handling command '" .. commandType .. "': " .. tostring(handlerErr))
		end
	else
		warn("[Dashboard] Unknown command type: " .. commandType)
	end
end

-- Subscribe with retry
local function subscribe()
	local success, err = pcall(function()
		MessagingService:SubscribeAsync(TOPIC, onMessageReceived)
	end)

	if success then
		print("[Dashboard] Subscribed to MessagingService topic: " .. TOPIC)
	else
		warn("[Dashboard] Failed to subscribe to MessagingService: " .. tostring(err))
		-- Retry after delay
		task.delay(10, subscribe)
	end
end

subscribe()

print("[Dashboard] DashboardCommandHandler loaded. Listening for commands on topic '" .. TOPIC .. "'")
--a