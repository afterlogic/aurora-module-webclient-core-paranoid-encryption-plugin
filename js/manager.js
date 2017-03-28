'use strict';

var	
	$ = require('jquery'),
	_ = require('underscore'),
	
	App = require('%PathToCoreWebclientModule%/js/App.js'),
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	CCrypto = require('modules/%ModuleName%/js/CCrypto.js'),
	Settings = require('modules/%ModuleName%/js/Settings.js')
;

function IsJscryptoSupported()
{
	return !!window.crypto.subtle;
}

module.exports = function (oAppData) {
	
	return {
		/**
		 * Runs before application start. Subscribes to the event before post displaying.
		 * 
		 * @param {Object} ModulesManager
		 */
		start: function (ModulesManager) {
			IsJscryptoSupported()
			{
				ModulesManager.run('SettingsWebclient', 'registerSettingsTab', [function () { return require('modules/%ModuleName%/js/views/JscryptoSettingsPaneView.js'); }, 'jscrypto', TextUtils.i18n('%MODULENAME%/LABEL_SETTINGS_TAB')]);
			}
		},
		decryptFile: function (sDownloadLink, sFileName, iFileSize, iv) {
			if (!CCrypto.getCriptKey())
			{
				Screens.showError(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY'));
				return;
			}
			CCrypto.downloadDividedFile(sFileName, iFileSize, sDownloadLink, iv);
			return;
		},
		encryptFile: function (sUid, oFileInfo, fOnChunkEncryptCallback, sFileName) {
			if (Settings.EncryptionAllowedModules && Settings.EncryptionAllowedModules.length > 0 && !Settings.EncryptionAllowedModules.includes(sFileName))
			{
				return false;
			}
			if (!CCrypto.getCriptKey())
			{
				Screens.showError(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY'));
				return false;
			}
			CCrypto.start(oFileInfo);
			CCrypto.readChunk(sUid, fOnChunkEncryptCallback);
		}
	};
};
