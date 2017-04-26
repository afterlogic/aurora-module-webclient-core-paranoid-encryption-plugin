'use strict';

var ko = require('knockout');

module.exports = {
	ServerModuleName: '%ModuleName%',
	HashModuleName: 'jscrypto',
	EncryptionAllowedModules: ['Files'],
	
	EnableJscrypto: ko.observable(true),
	
	init: function (oAppDataSection) {
		if (oAppDataSection)
		{
			this.EnableJscrypto(!!oAppDataSection.EnableModule);
		}
	},
	
	update: function (bEnableJscrypto)
	{
		this.EnableJscrypto(bEnableJscrypto);
	}
};