-- Optional client display for owner warnings and announcements.
-- Install as a LocalScript in StarterPlayer > StarterPlayerScripts.
-- This script receives messages only; all administrative actions stay server-side.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "ScubaOpsNotices"
screen.ResetOnSpawn = false
screen.DisplayOrder = 100
screen.Parent = playerGui

local panel = Instance.new("Frame")
panel.Name = "Notice"
panel.AnchorPoint = Vector2.new(0.5, 0)
panel.Position = UDim2.new(0.5, 0, 0, -120)
panel.Size = UDim2.new(1, -32, 0, 94)
panel.BackgroundColor3 = Color3.fromRGB(12, 24, 32)
panel.BackgroundTransparency = 0.04
panel.BorderSizePixel = 0
panel.Visible = false
panel.Parent = screen

local sizeLimit = Instance.new("UISizeConstraint")
sizeLimit.MaxSize = Vector2.new(520, 94)
sizeLimit.MinSize = Vector2.new(280, 94)
sizeLimit.Parent = panel

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 12)
corner.Parent = panel

local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(48, 190, 178)
stroke.Transparency = 0.25
stroke.Thickness = 1
stroke.Parent = panel

local accent = Instance.new("Frame")
accent.Size = UDim2.new(0, 3, 1, -24)
accent.Position = UDim2.new(0, 12, 0, 12)
accent.BackgroundColor3 = Color3.fromRGB(48, 190, 178)
accent.BorderSizePixel = 0
accent.Parent = panel

local accentCorner = Instance.new("UICorner")
accentCorner.CornerRadius = UDim.new(1, 0)
accentCorner.Parent = accent

local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.Position = UDim2.new(0, 27, 0, 12)
title.Size = UDim2.new(1, -42, 0, 18)
title.Font = Enum.Font.GothamBold
title.Text = "SCUBA SIMULATOR"
title.TextColor3 = Color3.fromRGB(115, 230, 216)
title.TextSize = 11
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = panel

local body = Instance.new("TextLabel")
body.BackgroundTransparency = 1
body.Position = UDim2.new(0, 27, 0, 33)
body.Size = UDim2.new(1, -42, 0, 36)
body.Font = Enum.Font.GothamMedium
body.Text = ""
body.TextColor3 = Color3.fromRGB(240, 247, 248)
body.TextSize = 14
body.TextWrapped = true
body.TextXAlignment = Enum.TextXAlignment.Left
body.TextYAlignment = Enum.TextYAlignment.Top
body.Parent = panel

local attribution = Instance.new("TextLabel")
attribution.BackgroundTransparency = 1
attribution.Position = UDim2.new(0, 27, 1, -19)
attribution.Size = UDim2.new(1, -42, 0, 12)
attribution.Font = Enum.Font.Code
attribution.Text = "OWNER MESSAGE"
attribution.TextColor3 = Color3.fromRGB(141, 163, 170)
attribution.TextSize = 9
attribution.TextXAlignment = Enum.TextXAlignment.Left
attribution.Parent = panel

local noticeId = 0
local function showNotice(kind, message, issuedBy)
  noticeId += 1
  local currentId = noticeId
  title.Text = kind == "warning" and "OWNER WARNING" or "SCUBA SIMULATOR ANNOUNCEMENT"
  body.Text = tostring(message or "")
  attribution.Text = "FROM " .. string.upper(tostring(issuedBy or "GAME OWNER"))
  accent.BackgroundColor3 = kind == "warning" and Color3.fromRGB(246, 185, 85) or Color3.fromRGB(48, 190, 178)
  stroke.Color = accent.BackgroundColor3
  panel.Visible = true
  panel.Position = UDim2.new(0.5, 0, 0, -120)

  TweenService:Create(panel, TweenInfo.new(0.28, Enum.EasingStyle.Quint, Enum.EasingDirection.Out), {
    Position = UDim2.new(0.5, 0, 0, 24),
  }):Play()

  task.delay(8, function()
    if noticeId ~= currentId then return end
    local tween = TweenService:Create(panel, TweenInfo.new(0.24, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
      Position = UDim2.new(0.5, 0, 0, -120),
    })
    tween:Play()
    tween.Completed:Wait()
    if noticeId == currentId then panel.Visible = false end
  end)
end

local announcements = ReplicatedStorage:WaitForChild("NexusDashboardAnnouncement", 30)
if announcements and announcements:IsA("RemoteEvent") then
  announcements.OnClientEvent:Connect(function(message, issuedBy)
    showNotice("announcement", message, issuedBy)
  end)
end

local warnings = ReplicatedStorage:WaitForChild("NexusDashboardWarning", 30)
if warnings and warnings:IsA("RemoteEvent") then
  warnings.OnClientEvent:Connect(function(message, issuedBy)
    showNotice("warning", message, issuedBy)
  end)
end
