'use strict';
'require form';

return L.Class.extend({
	title: _('TCPConns Plugin Configuration'),
	description: _('The tcpconns plugin collects information about open tcp connections on selected ports.'),

	addFormOptions: function(s) {
		var o;

		o = s.option(form.Flag, 'enable', _('Enable this plugin'));
		o.default = '0';

		o = s.option(form.Flag, 'ListeningPorts', _('Monitor all local listen ports'));
		o.default = '1';
		o.depends('enable', '1');

		o = s.option(form.Value, 'LocalPorts', _('Monitor local ports'));
		o.optional = true;
		o.depends({ enable: '1', ListeningPorts: '0' });

		o = s.option(form.Value, 'RemotePorts', _('Monitor remote ports'));
		o.optional = true;
		o.depends({ enable: '1', ListeningPorts: '0' });
	},

	configSummary: function(section) {
		var lports = L.toArray(section.LocalPorts),
		    rports = L.toArray(section.RemotePorts);

		if (section.ListeningPorts == '1')
			return _('Monitoring local listen ports');
		else
			return _('Monitoring %s and %s').format(
				N_(lports.length, 'one local port', '%d local ports').format(lports.length),
				N_(rports.length, 'one remote port', '%d remote ports').format(rports.length)
			);
	}
});
