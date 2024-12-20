-- Copyright 2016-2019 Xingwang Liao <kuoruan@gmail.com>
-- Licensed to the public under the MIT License.

local fs   = require "nixio.fs"
local sys  = require "luci.sys"
local http = require "luci.http"
local util = require "luci.util"
local uci  = require "luci.model.uci".cursor()

module("luci.controller.aria2", package.seeall)

function index()
	if not nixio.fs.access("/etc/config/aria2") then
		return
	end

	local e = entry({"admin", "bittorrent", "aria2"}, firstchild(), _("Aria2"))
	e.dependent = false
	e.acl_depends = { "luci-app-aria2" }

	entry({"admin", "bittorrent", "aria2", "config"},
		cbi("aria2/config"), _("Configuration"), 1)

	entry({"admin", "bittorrent", "aria2", "file"},
		form("aria2/files"), _("Files"), 2)

	entry({"admin", "bittorrent", "aria2", "log"},
		firstchild(), _("Log"), 3)

	entry({"admin", "bittorrent", "aria2", "log", "view"},
		template("aria2/log_template"))

	entry({"admin", "bittorrent", "aria2", "log", "read"},
		call("action_log_read"))

	entry({"admin", "bittorrent", "aria2", "status"},
		call("action_status"))

end

function action_status()
	local status = {
		running = (sys.call("pidof aria2c >/dev/null") == 0)
	}

	http.prepare_content("application/json")
	http.write_json(status)
end

function action_log_read()
	local data = { log = "", syslog = "" }

	local log_file = uci:get("aria2", "main", "log") or "/var/log/aria2.log"
	if fs.access(log_file) then
		data.log = util.trim(sys.exec("tail -n 50 %s | sed 'x;1!H;$!d;x'" % log_file))
	end

	data.syslog = util.trim(sys.exec("logread | grep aria2 | tail -n 50 | sed 'x;1!H;$!d;x'"))

	http.prepare_content("application/json")
	http.write_json(data)
end
