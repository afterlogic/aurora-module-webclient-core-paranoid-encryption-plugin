'use strict';

var	
	$ = require('jquery'),
	_ = require('underscore'),
	
	App = require('%PathToCoreWebclientModule%/js/App.js'),
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	CCrypto = require('modules/%ModuleName%/js/CCrypto.js')
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
			App.subscribeEvent('FilesView::onGetFilesResponse', function (oFileList) { // show parts like one file
				var 
					aFileList = oFileList.list,
					aFilesParts = _.filter(aFileList, function (oFile) {
						return oFile.fileName().match(/\.part(\d)+$/) !== null;
					}),
					aFilesNames = _.map(aFilesParts,  function (oFile) {
						return oFile.fileName().replace(/\.part(\d)+$/, '');
					}),
					aFilesNamesUnique = aFilesNames.filter(function (value, index, self) {
						return self.indexOf(value) === index;
					}),
					oFilesPartsGroup = new Object,
					oGluedFiles = new Object,
					aFiles = [];
				;
					_.each(aFilesNamesUnique, function(sFileName) {
						oFilesPartsGroup[sFileName] = _.filter(aFilesParts, function (oFile) {
							var pattern = sFileName + '\\.part(\\d)+$';
							return oFile.fileName().match(new RegExp(pattern, "i")) !== null;
						});
					});
					_.each(oFilesPartsGroup, function(aFiles, key, list) {
						var 
							iFileSize = 0,
							aLinks = []
						;
						_.each(aFiles, function(oFile) {
							iFileSize += oFile.size();
							aLinks[oFile.fileName().match(/\.part(\d+)$/)[1]] = oFile.getActionUrl('download');
						});
						oGluedFiles[key] = list[key][0];
						oGluedFiles[key].size(iFileSize);
						oGluedFiles[key].chunksLinks = aLinks;
						oGluedFiles[key].fileName(key);
					});
					aFiles = _.filter(aFileList, function (oFile) {
						return oFile.fileName().match(/\.part(\d)+$/) === null;
					})
				;
				oFileList.list = aFiles;
			});
			IsJscryptoSupported()
			{
				ModulesManager.run('SettingsWebclient', 'registerSettingsTab', [function () { return require('modules/%ModuleName%/js/views/JscryptoSettingsPaneView.js'); }, 'jscrypto', TextUtils.i18n('%MODULENAME%/LABEL_SETTINGS_TAB')]);
			}
		},
		decryptFile: function (sDownloadLink, sFileName, aChunksLinks) {
//			var
//				oReq = new XMLHttpRequest(),
//				sName = sFileName
//			;
			if (aChunksLinks)
			{
				if (!CCrypto.getCriptKey())
				{
					Screens.showError(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY'));
					return;
				}
				CCrypto.downloadDividedFile(sFileName, aChunksLinks);
				return;
			}
			else
			{
				return false;
			}
//			if (!sFileName.match(/\.encrypted$/))
//			{
//				return false;
//			}
//			else
//			{
//				sFileName = sFileName.replace(/\.encrypted$/, '');
//			}
//
//			oReq.open("GET", sDownloadLink, true);
//			oReq.responseType = "arraybuffer";
//
//			oReq.onload = function (oEvent)
//			{
//				var arrayBuffer = oReq.response;
//				if (arrayBuffer)
//				{
//					crypto.subtle.decrypt({ name: 'AES-CBC', iv: oCrypto.iv }, oCrypto.oCriptCKey, arrayBuffer)
//						.then(function (decrypted) {
//							var file = new Blob([decrypted]);
//							FileSaver.saveAs(file, sName);
//							file = null;
//							decrypted = null;
//							return true;
//						})
//						.catch(function(err){
//							Screens.showError(err);
//						});
//				}
//				arrayBuffer = null;
//				oReq = null;
//			};
//			oReq.send(null);
		},
		encryptFile: function (sUid, oFileInfo, fOnChunkEncryptCallback) {
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
