'use strict';

var fileSaver = require('modules/%ModuleName%/js/vendors/FileSaver.js');
var Storage = require('%PathToCoreWebclientModule%/js/Storage.js');
var Browser = require('%PathToCoreWebclientModule%/js/Browser.js');
var Screens = require('%PathToCoreWebclientModule%/js/Screens.js');

var fGetKey = function () {
	var key = Storage.getData('criptKey');
	if (!key)
	{
		fCreateKey("12345");
		key = Storage.getData('criptKey');
	}
	return crypto.subtle.importKey(
		'raw',
		new Uint8Array(key.data),
		{
			name: "AES-CBC",
		},
		true,
		["encrypt", "decrypt"]
	);
};

var fCreateKey = function (sPassword) {
	var crpt = require('crypto');
	var hash = crpt.createHash('md5').update(sPassword).digest();
	Storage.setData('criptKey', hash);
}
module.exports = function (oAppData) {
	
	return {
		/**
		 * Runs before application start. Subscribes to the event before post displaying.
		 * 
		 * @param {Object} ModulesManager
		 */
		decryptFile: function (sDownloadLink, sFileName) {
			if (!sFileName.match(/\.encrypted$/))
			{
				return false;
			}
			else
			{
				sFileName = sFileName.replace(/\.encrypted$/, '');
			}
			var oReq = new XMLHttpRequest();
			var iv = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7]);
			oReq.open("GET", sDownloadLink, true);
			oReq.responseType = "arraybuffer";
			var sKey;
			var sName = sFileName;

			fGetKey().then(key => {sKey = key});

			oReq.onload = function (oEvent) {
				var arrayBuffer = oReq.response;
				if (arrayBuffer)
				{
					crypto.subtle.decrypt({ 'name': 'AES-CBC', iv }, sKey, arrayBuffer)
						.then(decrypted => {
							var file =new Blob([decrypted]);
							fileSaver.saveAs(file, sName);
							file = null;
							decrypted = null;
							return true;
						})
						.catch(function(err){
							Screens.showError(err);
						});
				}
				arrayBuffer = null;
				oReq = null;
			};
			oReq.send(null);
		},
		encryptFile: function (sUid, oFileInfo, fCallback) {
			//var iv = crypto.getRandomValues(new Uint8Array(16));
			var iv = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7]);
			Storage.setData('iv', iv);
			var reader = new FileReader();

			reader.onload = function(e) {
				var oFileArrayBuffer = e.target.result;
				
				fGetKey().then(key => {
					crypto.subtle.encrypt({ 'name': 'AES-CBC', iv }, key, oFileArrayBuffer)
						.then(oEncryptedArrayBuffer => {
							var oEncryptedFile = new Blob([oEncryptedArrayBuffer], {type: "text/plain"});
							
							oFileArrayBuffer = null;							
							oFileInfo['FileName'] = oFileInfo['FileName'] + '.encrypted';
							oFileInfo['File'] = oEncryptedFile;
							fCallback(sUid, oFileInfo);
						})
						.catch(function(err){
							Screens.showError(err);
						});
				});
			}
			reader.readAsArrayBuffer(oFileInfo['File']);
		}
	};
};
