'use strict';

var
	ko = require('knockout'),
	_ = require('underscore'),
	
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js')
;

module.exports = {
	ServerModuleName: '%ModuleName%',
	HashModuleName: 'paranoid-encryption',
	EncryptionAllowedModules: ['Files'],
	
	EnableJscrypto: ko.observable(true),
	EncryptionMode: ko.observable(Enums.EncryptionMode.Always),
	
	/**
	 * Initializes settings from AppData object sections.
	 * 
	 * @param {Object} oAppData Object contained modules settings.
	 */
	init: function (oAppData)
	{
		var oAppDataSection = _.extend({}, oAppData[this.ServerModuleName] || {}, oAppData['%ModuleName%'] || {});
		
		if (!_.isEmpty(oAppDataSection))
		{
			this.EnableJscrypto(Types.pBool(oAppDataSection.EnableModule, this.EnableJscrypto()));
			this.EncryptionMode(Types.pEnum(oAppDataSection.EncryptionMode, Enums.EncryptionMode, this.EncryptionMode()));
		}
	},
	
	/**
	 * Updates new settings values after saving on server.
	 * 
	 * @param {boolean} bEnableJscrypto
	 * @param {number} iEncryptionMode
	 */
	update: function (bEnableJscrypto, iEncryptionMode)
	{
		this.EnableJscrypto(bEnableJscrypto);
		this.EncryptionMode(iEncryptionMode);
	}
};
