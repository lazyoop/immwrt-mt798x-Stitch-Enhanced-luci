dsp = require "luci.dispatcher"
arg[1] = arg[1] or ""


m5 = Map("mwan3", translatef("MWAN Interface Configuration - %s", arg[1]))
	m5.redirect = dsp.build_url("admin", "network", "mwan", "interface")


mwan_interface = m5:section(NamedSection, arg[1], "interface", "")
	mwan_interface.addremove = false
	mwan_interface.dynamic = false


enabled = mwan_interface:option(ListValue, "enabled", translate("Enabled"))
	enabled.default = "1"
	enabled:value("1", translate("Yes"))
	enabled:value("0", translate("No"))

initial_state = mwan_interface:option(ListValue, "initial_state", translate("Initial state"),
	translate("Expect interface state on up event"))
	initial_state.default = "online"
	initial_state:value("online", translate("Online"))
	initial_state:value("offline", translate("Offline"))

family = mwan_interface:option(ListValue, "family", translate("Internet Protocol"))
	family.default = "ipv4"
	family:value("ipv4", translate("IPv4"))
	family:value("ipv6", translate("IPv6"))

track_ip = mwan_interface:option(DynamicList, "track_ip", translate("Tracking hostname or IP address"),
	translate("This hostname or IP address will be pinged to determine if the link is up or down. Leave blank to assume interface is always online"))
	track_ip.datatype = "host"

track_method = mwan_interface:option(ListValue, "track_method", translate("Tracking method"))
	track_method.default = "ping"
	track_method:value("ping")
	track_method:value("arping")
	track_method:value("httping")

reliability = mwan_interface:option(Value, "reliability", translate("Tracking reliability"),
	translate("Acceptable values: 1-100. This many Tracking IP addresses must respond for the link to be deemed up"))
	reliability.datatype = "range(1, 100)"
	reliability.default = "1"

count = mwan_interface:option(ListValue, "count", translate("Ping count"))
	count.default = "1"
	count:value("1")
	count:value("2")
	count:value("3")
	count:value("4")
	count:value("5")

size = mwan_interface:option(Value, "size", translate("Ping size"))
	size.default = "56"
	size:value("8")
	size:value("24")
	size:value("56")
	size:value("120")
	size:value("248")
	size:value("504")
	size:value("1016")
	size:value("1472")
	size:value("2040")
	size.datatype = "range(1, 65507)"
	size.rmempty = false
	size.optional = false

timeout = mwan_interface:option(ListValue, "timeout", translate("Ping timeout"))
	timeout.default = "2"
	timeout:value("1", translatef("%d second", 1))
	timeout:value("2", translatef("%d seconds", 2))
	timeout:value("3", translatef("%d seconds", 3))
	timeout:value("4", translatef("%d seconds", 4))
	timeout:value("5", translatef("%d seconds", 5))
	timeout:value("6", translatef("%d seconds", 6))
	timeout:value("7", translatef("%d seconds", 7))
	timeout:value("8", translatef("%d seconds", 8))
	timeout:value("9", translatef("%d seconds", 9))
	timeout:value("10", translatef("%d seconds", 10))

interval = mwan_interface:option(ListValue, "interval", translate("Ping interval"))
	interval.default = "5"
	interval:value("1", translatef("%d second", 1))
	interval:value("3", translatef("%d seconds", 3))
	interval:value("5", translatef("%d seconds", 5))
	interval:value("10", translatef("%d seconds", 10))
	interval:value("20", translatef("%d seconds", 20))
	interval:value("30", translatef("%d seconds", 30))
	interval:value("60", translatef("%d minute", 1))
	interval:value("300", translatef("%d minutes", 5))
	interval:value("600", translatef("%d minutes", 10))
	interval:value("900", translatef("%d minutes", 15))
	interval:value("1800", translatef("%d minutes", 30))
	interval:value("3600", translatef("%d hour", 1))

failure = mwan_interface:option(Value, "failure_interval", translate("Failure interval"),
	translate("Ping interval during failure detection"))
	failure.default = "5"
	failure:value("1", translatef("%d second", 1))
	failure:value("3", translatef("%d seconds", 3))
	failure:value("5", translatef("%d seconds", 5))
	failure:value("10", translatef("%d seconds", 10))
	failure:value("20", translatef("%d seconds", 20))
	failure:value("30", translatef("%d seconds", 30))
	failure:value("60", translatef("%d minute", 1))
	failure:value("300", translatef("%d minutes", 5))
	failure:value("600", translatef("%d minutes", 10))
	failure:value("900", translatef("%d minutes", 15))
	failure:value("1800", translatef("%d minutes", 30))
	failure:value("3600", translatef("%d hour", 1))

keep_failure = mwan_interface:option(Flag, "keep_failure_interval", translate("Keep failure interval"),
	translate("Keep ping failure interval during failure state"))
	keep_failure.default = keep_failure.disabled

recovery = mwan_interface:option(Value, "recovery_interval", translate("Recovery interval"),
	translate("Ping interval during failure recovering"))
	recovery.default = "5"
	recovery:value("1", translatef("%d second", 1))
	recovery:value("3", translatef("%d seconds", 3))
	recovery:value("5", translatef("%d seconds", 5))
	recovery:value("10", translatef("%d seconds", 10))
	recovery:value("20", translatef("%d seconds", 20))
	recovery:value("30", translatef("%d seconds", 30))
	recovery:value("60", translatef("%d minute", 1))
	recovery:value("300", translatef("%d minutes", 5))
	recovery:value("600", translatef("%d minutes", 10))
	recovery:value("900", translatef("%d minutes", 15))
	recovery:value("1800", translatef("%d minutes", 30))
	recovery:value("3600", translatef("%d hour", 1))

down = mwan_interface:option(ListValue, "down", translate("Interface down"),
	translate("Interface will be deemed down after this many failed ping tests"))
	down.default = "3"
	down:value("1")
	down:value("2")
	down:value("3")
	down:value("4")
	down:value("5")
	down:value("6")
	down:value("7")
	down:value("8")
	down:value("9")
	down:value("10")

up = mwan_interface:option(ListValue, "up", translate("Interface up"),
	translate("Downed interface will be deemed up after this many successful ping tests"))
	up.default = "3"
	up:value("1")
	up:value("2")
	up:value("3")
	up:value("4")
	up:value("5")
	up:value("6")
	up:value("7")
	up:value("8")
	up:value("9")
	up:value("10")

flush = mwan_interface:option(ListValue, "flush_conntrack", translate("Flush conntrack table"),
	translate("Flush global firewall conntrack table on interface events"))
	flush.default = "never"
	flush:value("ifup", translate("ifup"))
	flush:value("ifdown", translate("ifdown"))
	flush:value("never", translate("never"))
	flush:value("always", translate("always"))

metric = mwan_interface:option(DummyValue, "metric", translate("Metric"),
	translate("This displays the metric assigned to this interface in /etc/config/network"))
	metric.rawhtml = true
	function metric.cfgvalue(self, s)
		local uci = uci.cursor(nil, "/var/state")
		local metric = uci:get("network", arg[1], "metric")
		if metric then
			return metric
		else
			return "&#8212;"
		end
	end

return m5
