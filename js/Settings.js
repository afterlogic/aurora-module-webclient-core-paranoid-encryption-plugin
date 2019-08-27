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
	EncryptionAllowedStorages: ['personal', 'corporate'],

	EnableJscrypto: ko.observable(true),
	EncryptionMode: ko.observable(Enums.EncryptionMode.Always),
	ChunkSizeMb: 5,
	AllowMultiChunkUpload: true,
	AllowChangeSettings: false,

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
			this.ChunkSizeMb = Types.pInt(oAppDataSection.ChunkSizeMb, this.ChunkSizeMb);
			this.AllowMultiChunkUpload = Types.pBool(oAppDataSection.AllowMultiChunkUpload, this.AllowMultiChunkUpload);
			this.AllowChangeSettings = Types.pBool(oAppDataSection.AllowChangeSettings, this.AllowChangeSettings);
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
		this.EncryptionMode(Types.pInt(iEncryptionMode));
	}
};
