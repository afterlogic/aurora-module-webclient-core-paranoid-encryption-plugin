'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	FileSaver = require('modules/%ModuleName%/js/vendors/FileSaver.js'),
	StreamSaver = require('modules/%ModuleName%/js/vendors/StreamSaver.js'),
	Polyfill = require('modules/%ModuleName%/js/vendors/polyfill.min.js'),
	Browser = require('%PathToCoreWebclientModule%/js/Browser.js'),
	JscryptoKey = require('modules/%ModuleName%/js/JscryptoKey.js')
;

/**
 * @constructor
 */
function CCrypto()
{
	this.iChunkNumber = 10;
	this.iChunkSize = 5 * 1024 * 1024;
	this.iCurrChunk = 0;
	this.oChunk = null;
	this.iv = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7]);
	this.key = null;
	this.criptKey = ko.observable(JscryptoKey.getKey());
	JscryptoKey.getKeyObservable().subscribe(function () {
		this.criptKey(JscryptoKey.getKey());
	}, this);
}
CCrypto.prototype.start = function (oFileInfo)
{
	this.oFileInfo = oFileInfo;
	this.oFile = oFileInfo['File'];
	this.iChunkNumber = Math.ceil(oFileInfo['File'].size/this.iChunkSize);
	this.iCurrChunk = 0;
	this.oChunk = null;
}
CCrypto.prototype.getCriptKey = function (oFileInfo)
{
	return this.criptKey();
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
	crypto.subtle.encrypt({ name: 'AES-CBC', iv: this.iv }, this.criptKey(), this.oChunk)
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
		.catch(function(err) {
			Screens.showError(err);
		})
	;
};

CCrypto.prototype.downloadDividedFile = function (sFileName, aChunksLinks)
{
	var
		oWriter = Browser.chrome ? new CChromeWriter(sFileName) : new CWriter(sFileName),
		iCurrChunk = 1,
		iv = this.iv,
		key = this.criptKey()
	;

	function writeChunk(oDecryptedUint8Array)
	{
		oWriter.write(oDecryptedUint8Array);
		if (iCurrChunk < aChunksLinks.length)
		{ 
			decryptChunk(aChunksLinks[iCurrChunk]);
			iCurrChunk++
		}
		else
		{
			oWriter.close();
		}
	}

	function decryptChunk(sDownloadLink)
	{
		var oReq = new XMLHttpRequest();
		oReq.open("GET", sDownloadLink, true);

		oReq.responseType = 'arraybuffer';

		oReq.onload = function (oEvent)
		{
			var oArrayBuffer = oReq.response;
			if (oReq.status === 200 && oArrayBuffer)
			{
				crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv }, key, oArrayBuffer)
					.then(function (oDecryptedArrayBuffer) {
						var oDecryptedUint8Array = new Uint8Array(oDecryptedArrayBuffer);
						writeChunk(oDecryptedUint8Array);
					})
					.catch(function(err) {
						Screens.showError(err);
					})
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

	decryptChunk(aChunksLinks[iCurrChunk++]);
}

module.exports = new  CCrypto();