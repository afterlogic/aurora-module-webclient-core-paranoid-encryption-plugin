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
	EncryptionAllowedStorages: ['personal'],

	enableJscrypto: ko.observable(true),
	EnableInPersonalStorage: false,
	ChunkSizeMb: 5,
	AllowMultiChunkUpload: true,
	AllowChangeSettings: false,
	DontRemindMe: ko.observable(false),

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
			this.enableJscrypto(Types.pBool(oAppDataSection.EnableModule, this.enableJscrypto()));
			this.DontRemindMe(Types.pBool(oAppDataSection.DontRemindMe, this.DontRemindMe()));
			this.EnableInPersonalStorage = Types.pBool(oAppDataSection.EnableInPersonalStorage, this.EnableInPersonalStorage);
			this.ChunkSizeMb = Types.pInt(oAppDataSection.ChunkSizeMb, this.ChunkSizeMb);
			this.AllowMultiChunkUpload = Types.pBool(oAppDataSection.AllowMultiChunkUpload, this.AllowMultiChunkUpload);
			this.AllowChangeSettings = Types.pBool(oAppDataSection.AllowChangeSettings, this.AllowChangeSettings);
		}
	},

	/**
	 * Updates new settings values after saving on server.
	 *
	 * @param {boolean} bEnableJscrypto
	 * @param {number} bEnableInPersonalStorage
	 */
	update: function (bEnableJscrypto, bEnableInPersonalStorage)
	{
		this.enableJscrypto(bEnableJscrypto);
		this.EnableInPersonalStorage = bEnableInPersonalStorage;
	}
};
