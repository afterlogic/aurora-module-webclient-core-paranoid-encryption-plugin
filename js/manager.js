'use strict';

var	
	$ = require('jquery'),
	_ = require('underscore'),
	App = require('%PathToCoreWebclientModule%/js/App.js'),
	FileSaver = require('modules/%ModuleName%/js/vendors/FileSaver.js'),
	StreamSaver = require('modules/%ModuleName%/js/vendors/StreamSaver.js'),
	Polyfill = require('modules/%ModuleName%/js/vendors/polyfill.min.js'),
	Storage = require('%PathToCoreWebclientModule%/js/Storage.js'),
	Browser = require('%PathToCoreWebclientModule%/js/Browser.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	oCrypto = new CCrypto()
;

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
	var
		crpt = require('crypto'),
		hash = crpt.createHash('md5').update(sPassword).digest()
	;
	Storage.setData('criptKey', hash);
}

CCrypto.prototype.readChunk = function (sUid, fOnChunkEncryptCallback)
{ 
	var
		iStart = this.iChunkSize * this.iCurrChunk,
		iEnd = (this.iCurrChunk < (this.iChunkNumber - 1)) ? this.iChunkSize * (this.iCurrChunk + 1) : this.oFile.size,
		oReader = new FileReader(),
		oBlob = null
	;

	if (this.oFile.slice)
	{
		oBlob = this.oFile.slice(iStart, iEnd);
	}

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
				oEncryptedFile = new Blob([oEncryptedContent], {type: "text/plain", lastModified: new Date()}),
				fProcessNextChunkCallback = _.bind(function (sUid, fOnChunkEncryptCallback) {
					if (this.iCurrChunk < this.iChunkNumber)
					{
						this.readChunk(sUid, fOnChunkEncryptCallback);
					}
				}, this)
			;

			this.oFileInfo['FileName'] = this.oFile.name + '.encrypted.part' + this.iCurrChunk;
			this.oFileInfo['File'] = oEncryptedFile;
			fOnChunkEncryptCallback(sUid, this.oFileInfo, fProcessNextChunkCallback);
		}, this))
		.catch(console.error)
	;
};

CCrypto.prototype.downloadDividedFile = function (sFileName, aChunksLinks)
{
	var
		oWriter = Browser.chrome ? new CChromeWriter(sFileName) : new CWriter(sFileName),
		iCurrChunk = 1
	;

	function WriteChunk(oDecryptedUint8Array)
	{
		oWriter.write(oDecryptedUint8Array);
		if (iCurrChunk < aChunksLinks.length)
		{
			DecryptChunk(aChunksLinks[iCurrChunk]);
			iCurrChunk++
		}
		else
		{
			oWriter.close();
		}
	}

	function DecryptChunk(sDownloadLink)
	{
		var oReq = new XMLHttpRequest();
		oReq.open("GET", sDownloadLink, true);

		oReq.responseType = 'arraybuffer';

		oReq.onload = function (oEvent)
		{

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

	function CWriter(sFileName)
	{
		this.sName = sFileName.replace(/\.encrypted$/, '');
		this.aBuffer = [];

	}
	CWriter.prototype.write = function (oDecryptedUint8Array)
	{
		this.aBuffer.push(oDecryptedUint8Array);
	}
	CWriter.prototype.close = function ()
	{
		var file =new Blob(this.aBuffer); //NS_ERROR_OUT_OF_MEMORY
		FileSaver.saveAs(file, this.sName);
		file = null;
	}

	function CChromeWriter(sFileName)
	{
		var oFileStream = StreamSaver.createWriteStream(sFileName.replace(/\.encrypted$/, ''));
		this.oWriter = oFileStream.getWriter();

	}
	CChromeWriter.prototype.write = function (oDecryptedUint8Array)
	{
		this.oWriter.write(oDecryptedUint8Array);
	}
	CChromeWriter.prototype.close = function ()
	{
		this.oWriter.close();
	}

	DecryptChunk(aChunksLinks[iCurrChunk++]);
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
		},
		decryptFile: function (sDownloadLink, sFileName, aChunksLinks = null) {
			var
				oReq = new XMLHttpRequest(),
				sName = sFileName
			;
						
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

			oReq.open("GET", sDownloadLink, true);
			oReq.responseType = "arraybuffer";

			oReq.onload = function (oEvent)
			{
				var arrayBuffer = oReq.response;
				if (arrayBuffer)
				{
					crypto.subtle.decrypt({ name: 'AES-CBC', iv: oCrypto.iv }, oCrypto.oCriptCKey, arrayBuffer)
						.then(function (decrypted) {
							var file = new Blob([decrypted]);
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
			oCrypto.start(oFileInfo);
			oCrypto.readChunk(sUid, fOnChunkEncryptCallback);
		}
	};
};
