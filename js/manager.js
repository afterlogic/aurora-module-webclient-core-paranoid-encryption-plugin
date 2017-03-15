'use strict';

var $ = require('jquery');
var _ = require('underscore');
var App = require('%PathToCoreWebclientModule%/js/App.js');
var FileSaver = require('modules/%ModuleName%/js/vendors/FileSaver.js');
var StreamSaver = require('modules/%ModuleName%/js/vendors/StreamSaver.js');
var Polyfill = require('modules/%ModuleName%/js/vendors/polyfill.min.js');
var Storage = require('%PathToCoreWebclientModule%/js/Storage.js');
var Browser = require('%PathToCoreWebclientModule%/js/Browser.js');
var Screens = require('%PathToCoreWebclientModule%/js/Screens.js');

var oCrypto = new CCrypto();

function CCrypto()
{
	this.iChunkNumber = 10;
	this.iChunkSize = 5 * 1024 * 1024;
	this.iCurrChunk = 0;
	this.oChunk = null;
	this.iv = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7]);
	this.key = null;
	this.oCriptCKey = null;
}
CCrypto.prototype.start = function (oFileInfo)
{
	this.oFileInfo = oFileInfo;
	this.oFile = oFileInfo['File'];
	this.iChunkNumber = Math.ceil(oFileInfo['File'].size/this.iChunkSize);
	this.iCurrChunk = 0;
	this.oChunk = null;
}

CCrypto.prototype.getKey = function ()
{
	if (!this.key && Storage.hasData('criptKey'))
	{
		this.key = Storage.getData('criptKey');
	}
	else
	{
		this.createKey("12345");
		this.key = Storage.getData('criptKey');
	}
	crypto.subtle.importKey(
		'raw',
		new Uint8Array(this.key.data),
		{
			name: "AES-CBC",
		},
		true,
		["encrypt", "decrypt"]
	)
	.then(_.bind(function (key) {
		this.oCriptCKey = key;
	}, this));
};

CCrypto.prototype.createKey = function (sPassword)
{
	var crpt = require('crypto');
	var hash = crpt.createHash('md5').update(sPassword).digest();
	Storage.setData('criptKey', hash);
}

CCrypto.prototype.readChunk = function (sUid, fOnChunkEncryptCallback)
{
	var iStart = this.iChunkSize * this.iCurrChunk;
	var iEnd = (this.iCurrChunk < (this.iChunkNumber - 1)) ? this.iChunkSize * (this.iCurrChunk + 1) : this.oFile.size;
	var oReader = new FileReader();
	var oBlob = null;

	if (this.oFile.slice)
	{
		oBlob = this.oFile.slice(iStart, iEnd);
	}
//	else if (this.oFile.webkitSlice)
//	{ console.log("_2");
//		oBlob = this.this.oFile.webkitSlice(iStart, iEnd);
//	}
//	else if (this.oFile.mozSlice)
//	{ console.log("_3");
//		oBlob = this.oFile.mozSlice(iStart, iEnd);
//	}

	if (oBlob)
	{
		oReader.onloadend = _.bind(function(evt) {
			if (evt.target.readyState == FileReader.DONE)
			{
				this.oChunk = evt.target.result;
				this.iCurrChunk++;
				this.encryptChunk(sUid, fOnChunkEncryptCallback);
			}
		}, this);

		oReader.readAsArrayBuffer(oBlob);
	}
};

CCrypto.prototype.encryptChunk = function (sUid, fOnChunkEncryptCallback)
{
	crypto.subtle.encrypt({ name: 'AES-CBC', iv: this.iv }, this.oCriptCKey, this.oChunk)
		.then(_.bind(function (oEncryptedContent) {
			var
				oEncryptedFile = new File([oEncryptedContent], this.iCurrChunk + this.oFileInfo['FileName'] + '.encrypted', {type: "text/plain", lastModified: new Date()})
			;

			this.oFileInfo['FileName'] = this.oFile.name + '.encrypted.part' + this.iCurrChunk;
			this.oFileInfo['File'] = oEncryptedFile;
			var fProcessNextChunkCallback = _.bind(function (sUid, fOnChunkEncryptCallback) {
				if (this.iCurrChunk < this.iChunkNumber)
				{
					this.readChunk(sUid, fOnChunkEncryptCallback);
				}
			}, this);
			fOnChunkEncryptCallback(sUid, this.oFileInfo, fProcessNextChunkCallback);
		}, this))
		.catch(console.error)
	;
};

CCrypto.prototype.downloadDividedFile = function (sFileName, aChunksLinks)
{
	var
		oFileStream = StreamSaver.createWriteStream(sFileName),
		oWriter = oFileStream.getWriter(),
		iCurrChunk = 1
	;
	
	function WriteChunk(oDecryptedUint8Array)
	{
		oWriter.write(oDecryptedUint8Array);
		if (iCurrChunk < aChunksLinks.length)
		{
			DecryptChunk(aChunksLinks[iCurrChunk], sFileName);
			iCurrChunk++
		}
		else
		{
			oWriter.close();
		}
	}

	function DecryptChunk(sDownloadLink, sFileName)
	{
		var oReq = new XMLHttpRequest();
//		oReq.open('GET', './files/' + iCurrChunk + oCryptoTest.sName + '.encrypted', true);
		oReq.open("GET", sDownloadLink, true);
		
		oReq.responseType = 'arraybuffer';

		oReq.onload = function (oEvent) {

			var oArrayBuffer = oReq.response;
			if (oReq.status === 200 && oArrayBuffer)
			{
				crypto.subtle.decrypt({ name: 'AES-CBC', iv: oCrypto.iv }, oCrypto.oCriptCKey, oArrayBuffer)
					.then(function (oDecryptedArrayBuffer) {
						var oDecryptedUint8Array = new Uint8Array(oDecryptedArrayBuffer);
						WriteChunk(oDecryptedUint8Array);
					})
					.catch(console.error)
				;
			}
		};

		oReq.send(null);				
	}

	DecryptChunk(aChunksLinks[iCurrChunk++], sFileName);
}

oCrypto.getKey();

module.exports = function (oAppData) {
	
	return {
		/**
		 * Runs before application start. Subscribes to the event before post displaying.
		 * 
		 * @param {Object} ModulesManager
		 */
		start: function (ModulesManager) {
			App.subscribeEvent('FilesView::onGetFilesResponse', function (oFileList) {
				var aFileList = oFileList.list;
				var aFilesParts = _.filter(aFileList, function (oFile) {
					return oFile.fileName().match(/\.part(\d)+$/) !== null;
				});
				var aFilesNames = _.map(aFilesParts,  function (oFile) {
					return oFile.fileName().replace(/\.part(\d)+$/, '');
				});
				var aFilesNamesUnique = aFilesNames.filter(function (value, index, self) {
					return self.indexOf(value) === index;
				});
				var oFilesPartsGroup = new Object;
				_.each(aFilesNamesUnique, function(sFileName) {
					oFilesPartsGroup[sFileName] = _.filter(aFilesParts, function (oFile) {
						var pattern = sFileName + '\\.part(\\d)+$';
						return oFile.fileName().match(new RegExp(pattern, "i")) !== null;
					});
				});

				var oGluedFiles = new Object;
				_.each(oFilesPartsGroup, function(aFiles, key, list) {
					var iFileSize = 0;
					var aLinks = [];
					_.each(aFiles, function(oFile) {
						iFileSize += oFile.size();
						aLinks[oFile.fileName().match(/\.part(\d+)$/)[1]] = oFile.getActionUrl('download');
					});
					oGluedFiles[key] = list[key][0];
					oGluedFiles[key].size(iFileSize);
					oGluedFiles[key].chanksLinks = aLinks;
					oGluedFiles[key].fileName(key);
				});
				
				var aFiles = _.filter(aFileList, function (oFile) {
					return oFile.fileName().match(/\.part(\d)+$/) === null;
				});
				oFileList.list = aFiles;
			});
		},
		decryptFile: function (sDownloadLink, sFileName, aChunksLinks = null) {
			if (aChunksLinks)
			{
				oCrypto.downloadDividedFile(sFileName, aChunksLinks);
				return;
			}
			if (!sFileName.match(/\.encrypted$/))
			{
				return false;
			}
			else
			{
				sFileName = sFileName.replace(/\.encrypted$/, '');
			}
			var oReq = new XMLHttpRequest();

			oReq.open("GET", sDownloadLink, true);
			oReq.responseType = "arraybuffer";

			var sName = sFileName;

			oReq.onload = function (oEvent) {
				var arrayBuffer = oReq.response;
				if (arrayBuffer)
				{
					crypto.subtle.decrypt({ name: 'AES-CBC', iv: oCrypto.iv }, oCrypto.oCriptCKey, arrayBuffer)
						.then(decrypted => {
							var file =new Blob([decrypted]);
							FileSaver.saveAs(file, sName);
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
		encryptFile: function (sUid, oFileInfo, fOnChunkEncryptCallback) {
			var reader = new FileReader();
			if (true)//(Browser.chrome)
			{
				oCrypto.start(oFileInfo);
				oCrypto.readChunk(sUid, fOnChunkEncryptCallback);
			}
			else
			{
			reader.onload = function(e) {
				var oFileArrayBuffer = e.target.result;
				crypto.subtle.encrypt({ name: 'AES-CBC', iv: oCrypto.iv }, oCrypto.oCriptCKey, oFileArrayBuffer)
					.then(oEncryptedArrayBuffer => {
						var oEncryptedFile = new Blob([oEncryptedArrayBuffer], {type: "text/plain"});

						oFileArrayBuffer = null;							
						oFileInfo['FileName'] = oFileInfo['FileName'] + '.encrypted';
						oFileInfo['File'] = oEncryptedFile;
						fOnChunkEncryptCallback(sUid, oFileInfo, null);
					})
					.catch(function(err){
						Screens.showError(err);
					});
			}
			reader.readAsArrayBuffer(oFileInfo['File']);
			}
		}
	};
};
