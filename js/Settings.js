'use strict';

var ko = require('knockout');

module.exports = {
	ServerModuleName: 'Jscrypto',
	HashModuleName: 'jscrypto',
	EncryptionAllowedModules: ['Files'],
	
	enableJscrypto: ko.observable(true),
	
	init: function (oAppDataSection) {
		if (oAppDataSection)
		{
			this.enableJscrypto(!!oAppDataSection.EnableModule);
		}
	}
};