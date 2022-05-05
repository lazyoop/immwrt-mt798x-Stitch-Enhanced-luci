--[[
luci-app-filetransfer
Description: File upload / download
Author: yuleniwo  xzm2@qq.com  QQ:529698939
Modify: ayongwifi@126.com  www.openwrtdl.com
]]--

module("luci.controller.filetransfer", package.seeall)

function index()

	local page = entry({"admin", "system", "filetransfer"}, form("filetransfer"), _("FileTransfer"), 89)
	page.dependent = true
	page.acl_depends = { "luci-app-filetransfer" }
end
