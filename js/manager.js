'use strict';

var	
	$ = require('jquery'),
	_ = require('underscore'),
	
	App = require('%PathToCoreWebclientModule%/js/App.js'),
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	CCrypto = require('modules/%ModuleName%/js/CCrypto.js'),
	Settings = require('modules/%ModuleName%/js/Settings.js'),
	Browser = require('%PathToCoreWebclientModule%/js/Browser.js')
;

function IsJscryptoSupported()
{
	return !!window.crypto.subtle;
}

function IsHttpsEnable()
{
	return window.location.protocol === "https:";
}

module.exports = function (oAppData) {
	
	return {
		/**
		 * Runs before application start. Subscribes to the event before post displaying.
		 * 
		 * @param {Object} ModulesManager
		 */
		start: function (ModulesManager) {
			var bIsServiceWorkerAvailable = false;
			if (IsJscryptoSupported() && IsHttpsEnable())
			{
				ModulesManager.run('SettingsWebclient', 'registerSettingsTab', [function () { return require('modules/%ModuleName%/js/views/JscryptoSettingsPaneView.js'); }, 'jscrypto', TextUtils.i18n('%MODULENAME%/LABEL_SETTINGS_TAB')]);
				
				App.subscribeEvent('AbstractFileModel::FileDownload::before', function (oParams) {
					var
						oFile = oParams.oFile,
						fRegularDownloadFileCallback = oParams.fRegularDownloadFileCallback,
						iv = 'oExtendedProps' in oFile ? ('InitializationVector' in oFile.oExtendedProps ? oFile.oExtendedProps.InitializationVector : false) : false,
						sDownloadLink = oFile.getActionUrl('download')
					;
					if (!iv)
					{
						fRegularDownloadFileCallback(sDownloadLink);
					}
					else if (!CCrypto.getCriptKey())
					{
						Screens.showError(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY'));
					}
					else
					{
						oFile.startDownloading();
						CCrypto.downloadDividedFile(oFile, iv, bIsServiceWorkerAvailable);
					}
				});
				
				App.subscribeEvent('Jua::FileUpload::before', function (oParams) {
					var
						sUid = oParams.sUid,
						sModuleName = oParams.sModuleName,
						oFileInfo = oParams.oFileInfo,
						fOnChunkEncryptCallback = oParams.fOnChunkReadyCallback,
						fRegularUploadFileCallback = oParams.fRegularUploadFileCallback,
						fStartUploadCallback = function (oFileInfo, sUid, fOnChunkEncryptCallback) {
							CCrypto.oChunkQueue.isProcessed = true;
							CCrypto.start(oFileInfo);
							CCrypto.readChunk(sUid, fOnChunkEncryptCallback);
						}
					;

					if (Settings.EncryptionAllowedModules && Settings.EncryptionAllowedModules.length > 0 && !Settings.EncryptionAllowedModules.includes(sModuleName))
					{
						fRegularUploadFileCallback(sUid, oFileInfo);
					}
					else if (!CCrypto.getCriptKey())
					{
						Screens.showError(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY'));
					}
					else if (CCrypto.oChunkQueue.isProcessed === true)
					{
						CCrypto.oChunkQueue.aFiles.push({
							fStartUploadCallback: fStartUploadCallback,
							args: [	
								oFileInfo, 
								sUid, 
								fOnChunkEncryptCallback 
							]
						});
					}
					else
					{
						fStartUploadCallback(oFileInfo, sUid, fOnChunkEncryptCallback);
					}
				});
				
				App.subscribeEvent('CFilseView::FileDownloadCancel', function (oParams) {
					oParams.oFile.stopDownloading();
				});
				
				App.subscribeEvent('CFilseView::FileUploadCancel', function (oParams) {		
					CCrypto.stopUploading(oParams.sFileUploadUid , oParams.fOnUploadCancelCallback);
				});
				
				if (Browser.chrome)
				{
					navigator.serviceWorker.register('?stream-worker', {scope: './'})
						.then(function (swReg) {
							bIsServiceWorkerAvailable = true;
							swReg.unregister();
						})
						.catch(function (err) {
						});
				}
			}
		}
	};
};
