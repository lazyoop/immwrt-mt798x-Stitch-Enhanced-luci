'use strict';
'require form';

return L.Class.extend({
	title: _('CPU Plugin Configuration'),
	description: _('The cpu plugin collects basic statistics about the processor usage.'),

	addFormOptions: function(s) {
		var o;

		o = s.option(form.Flag, 'enable', _('Enable this plugin'));
		o.default = '0';

		o = s.option(form.Flag, 'ReportByCpu', _('Report by CPU'),
			_('By setting this, CPU is not aggregate of all processors on the system'));
		o.default = '1';
		o.depends('enable', '1');

		o = s.option(form.Flag, 'ReportByState', _('Report by state'),
			_('When set to true, reports per-state metric (system, user, idle)'));
		o.default = '1';
		o.depends('enable', '1');

		o = s.option(form.Flag, 'ValuesPercentage', _('Report in percent'),
			_('When set to true, we request percentage values'));
		o.default = '0';
		o.depends({ 'enable': '1', 'ReportByCpu': '1', 'ReportByState': '1' });
	},

	configSummary: function(section) {
		return _('CPU monitoring is enabled');
	}
});
