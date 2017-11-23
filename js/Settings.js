'use strict';

var ko = require('knockout');

module.exports = {
	ServerModuleName: '%ModuleName%',
	HashModuleName: 'paranoid-encryption',
	EncryptionAllowedModules: ['Files'],
	
	EnableJscrypto: ko.observable(true),
	EncryptionMode: ko.observable(0),
	
	init: function (oAppDataSection) {
		if (oAppDataSection)
		{
			this.EnableJscrypto(!!oAppDataSection.EnableModule);
			this.EncryptionMode(oAppDataSection.EncryptionMode ? oAppDataSection.EncryptionMode : Enums.EncryptionMode.Always);
		}
	},
	
	update: function (bEnableJscrypto, iEncryptionMode)
	{
		this.EnableJscrypto(bEnableJscrypto);
		this.EncryptionMode(iEncryptionMode);
	}
};