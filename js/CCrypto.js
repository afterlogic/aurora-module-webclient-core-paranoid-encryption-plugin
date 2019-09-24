'use strict';

var
	$ = require('jquery'),
	_ = require('underscore'),

	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	FileSaver = require('%PathToCoreWebclientModule%/js/vendors/FileSaver.js'),
	JscryptoKey = require('modules/%ModuleName%/js/JscryptoKey.js'),
	HexUtils = require('modules/%ModuleName%/js/utils/Hex.js'),
	Settings = require('modules/%ModuleName%/js/Settings.js')
;

/**
 * @constructor
 */
function CCrypto()
{
	this.iChunkNumber = 0;
	this.iChunkSize = Settings.ChunkSizeMb * 1024 * 1024;
	this.iCurrChunk = 0;
	this.oChunk = null;
	this.iv = null;
	// Queue of files awaiting upload
	this.oChunkQueue = {
		isProcessed: false,
		aFiles: []
	};
	this.aStopList = [];
	this.fOnUploadCancelCallback = null;
}

CCrypto.prototype.start = function (oFileInfo)
{
	this.oFileInfo = oFileInfo;
	this.oFile = oFileInfo.File;
	this.iChunkNumber = Math.ceil(oFileInfo.File.size/this.iChunkSize);
	this.iCurrChunk = 0;
	this.oChunk = null;
	this.iv = window.crypto.getRandomValues(new Uint8Array(16));
	this.oFileInfo.Hidden = { 'RangeType': 1 };
	this.oFileInfo.Hidden.ExtendedProps = { 'InitializationVector': HexUtils.Array2HexString(new Uint8Array(this.iv)) };
};

CCrypto.prototype.startUpload = function (oFileInfo, sUid, fOnChunkEncryptCallback, fCancelCallback)
{
	this.oChunkQueue.isProcessed = true;
	this.start(oFileInfo);
	JscryptoKey.getKey(
		_.bind(function() {
			this.readChunk(sUid, fOnChunkEncryptCallback);
		},this),
		fCancelCallback
	);
};

CCrypto.prototype.cryptoKey = function ()
{
	return JscryptoKey.key();
};

CCrypto.prototype.readChunk = function (sUid, fOnChunkEncryptCallback)
{
	var
		iStart = this.iChunkSize * this.iCurrChunk,
		iEnd = (this.iCurrChunk < (this.iChunkNumber - 1)) ? this.iChunkSize * (this.iCurrChunk + 1) : this.oFile.size,
		oReader = new FileReader(),
		oBlob = null
	;
	
	if (this.aStopList.indexOf(sUid) !== -1)
	{ // if user canceled uploading file with uid = sUid
		this.aStopList.splice(this.aStopList.indexOf(sUid), 1);
		this.checkQueue();
		return;
	}
	else
	{
		// Get file chunk
		if (this.oFile.slice)
		{
			oBlob = this.oFile.slice(iStart, iEnd);
		}
		else if (this.oFile.webkitSlice)
		{
			oBlob = this.oFile.webkitSlice(iStart, iEnd);
		}
		else if (this.oFile.mozSlice)
		{
			oBlob = this.oFile.mozSlice(iStart, iEnd);
		}

		if (oBlob)
		{
			try
			{ //Encrypt file chunk
				oReader.onloadend = _.bind(function(evt) {
					if (evt.target.readyState === FileReader.DONE)
					{
						this.oChunk = evt.target.result;
						this.iCurrChunk++;
						this.encryptChunk(sUid, fOnChunkEncryptCallback);
					}
				}, this);

				oReader.readAsArrayBuffer(oBlob);
			}
			catch(err)
			{
				Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_ENCRYPTION'));
			}
		}
	}
};

CCrypto.prototype.encryptChunk = function (sUid, fOnChunkEncryptCallback)
{
	crypto.subtle.encrypt({ name: 'AES-CBC', iv: this.iv }, this.cryptoKey(), this.oChunk)
		.then(_.bind(function (oEncryptedContent) {
			//delete padding for all chunks except last one
			oEncryptedContent = (this.iChunkNumber > 1 && this.iCurrChunk !== this.iChunkNumber) ? oEncryptedContent.slice(0, oEncryptedContent.byteLength - 16) : oEncryptedContent;
			var
				oEncryptedFile = new Blob([oEncryptedContent], {type: "text/plain", lastModified: new Date()}),
				//fProcessNextChunkCallback runs after previous chunk uploading
				fProcessNextChunkCallback = _.bind(function (sUid, fOnChunkEncryptCallback) {
					if (this.iCurrChunk < this.iChunkNumber)
					{// if it was not last chunk - read another chunk
						this.readChunk(sUid, fOnChunkEncryptCallback);
					}
					else
					{// if it was last chunk - check Queue for files awaiting upload
						this.oChunkQueue.isProcessed = false;
						this.checkQueue();
					}
				}, this)
			;
			this.oFileInfo.File = oEncryptedFile;
			//use last 16 byte of current chunk as initial vector for next chunk
			this.iv = new Uint8Array(oEncryptedContent.slice(oEncryptedContent.byteLength - 16));
			if (this.iCurrChunk === 1)
			{ // for first chunk enable 'FirstChunk' attribute. This is necessary to solve the problem of simultaneous loading of files with the same name
				this.oFileInfo.Hidden.ExtendedProps.FirstChunk = true;
			}
			else
			{
				delete this.oFileInfo.Hidden.ExtendedProps.FirstChunk;
			}
			
			if (this.iCurrChunk == this.iChunkNumber)
			{ // unmark file as loading
				delete this.oFileInfo.Hidden.ExtendedProps.Loading;
			}
			else
			{ // mark file as loading until upload doesn't finish
				this.oFileInfo.Hidden.ExtendedProps.Loading = true;
			}
			// call upload of encrypted chunk
			fOnChunkEncryptCallback(sUid, this.oFileInfo, fProcessNextChunkCallback, this.iCurrChunk, this.iChunkNumber, (this.iCurrChunk - 1) * this.iChunkSize);
		}, this))
		.catch(function(err) {
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_ENCRYPTION'));
		})
	;
};

CCrypto.prototype.downloadDividedFile = function (oFile, iv, fProcessBlobCallback)
{
	new CDownloadFile(oFile, iv, this.iChunkSize, fProcessBlobCallback);
};
/**
* Checking Queue for files awaiting upload
*/
CCrypto.prototype.checkQueue = function ()
{
	var aNode = null;
	if (this.oChunkQueue.aFiles.length > 0)
	{
		aNode = this.oChunkQueue.aFiles.shift();
		aNode.fStartUploadCallback.apply(aNode.fStartUploadCallback, [aNode.oFileInfo, aNode.sUid, aNode.fOnChunkEncryptCallback]);
	}
};
/**
* Stop file uploading
* 
* @param {String} sUid
* @param {Function} fOnUploadCancelCallback
*/
CCrypto.prototype.stopUploading = function (sUid, fOnUploadCancelCallback, sFileName)
{
	var bFileInQueue = false;
	 // If file await to be uploaded - delete it from queue
	this.oChunkQueue.aFiles.forEach(function (oData, index, array) {
		if (oData.sUid === sUid)
		{
			fOnUploadCancelCallback(sUid, oData.oFileInfo.FileName);
			array.splice(index, 1);
			bFileInQueue = true;
		}
	});

	if (!bFileInQueue)
	{
		this.aStopList.push(sUid);
		this.oChunkQueue.isProcessed = false;
		fOnUploadCancelCallback(sUid, sFileName);
//		this.checkQueue();
	}
};

CCrypto.prototype.viewEncryptedImage = function (oFile, iv)
{
	if (!this.isKeyInStorage())
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY'));
	}
	else
	{
		new CViewImage(oFile, iv, this.iChunkSize);
	}
};

CCrypto.prototype.isKeyInStorage = function ()
{
	return !!JscryptoKey.loadKeyFromStorage();
};

function CDownloadFile(oFile, iv, iChunkSize, fProcessBlobCallback)
{
	this.oFile = oFile;
	this.sFileName = oFile.fileName();
	this.iFileSize = oFile.size();
	this.sDownloadLink = oFile.getActionUrl('download');
	this.oWriter = new CWriter(this.sFileName, fProcessBlobCallback);
	this.iCurrChunk = 0;
	this.iv = new Uint8Array(HexUtils.HexString2Array(iv));
	this.key = null;
	this.iChunkNumber = Math.ceil(this.iFileSize/iChunkSize);
	this.iChunkSize = iChunkSize;
	JscryptoKey.getKey(_.bind(function(oKey) {
			this.key = oKey;
			this.decryptChunk();
		}, this),
		_.bind(function() {
			this.stopDownloading();
		}, this)
	);
}

CDownloadFile.prototype.writeChunk = function (oDecryptedUint8Array)
{
	if (this.oFile.downloading() !== true)
	{ // if download was canceled
		return;
	}
	else
	{
		this.oWriter.write(oDecryptedUint8Array); //write decrypted chunk
		if (this.iCurrChunk < this.iChunkNumber)
		{ //if it was not last chunk - decrypting another chunk
			this.decryptChunk();
		}
		else
		{
			this.stopDownloading();
			this.oWriter.close();
		}
	}
};

CDownloadFile.prototype.decryptChunk = function ()
{
	var oReq = new XMLHttpRequest();
	oReq.open("GET", this.getChunkLink(), true);

	oReq.responseType = 'arraybuffer';

	oReq.onprogress = _.bind(function(oEvent) {
		if (this.isDownloading())
		{
			this.oFile.onDownloadProgress(oEvent.loaded + (this.iCurrChunk-1) * this.iChunkSize, this.iFileSize);
		}
		else
		{
			oReq.abort();
		}
	}, this);
	oReq.onload =_.bind(function (oEvent)
	{
		var
			oArrayBuffer = oReq.response,
			oDataWithPadding = {}
		;
		if (oReq.status === 200 && oArrayBuffer)
		{
			oDataWithPadding = new Uint8Array(oArrayBuffer.byteLength + 16);
			oDataWithPadding.set( new Uint8Array(oArrayBuffer), 0);
			if (this.iCurrChunk !== this.iChunkNumber)
			{// for all chunk except last - add padding
				crypto.subtle.encrypt(
					{
						name: 'AES-CBC',
						iv: new Uint8Array(oArrayBuffer.slice(oArrayBuffer.byteLength - 16))
					},
					this.key,
					(new Uint8Array([16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16])).buffer // generate padding for chunk
				).then(_.bind(function(oEncryptedContent) {
						// add generated padding to data
						// oEncryptedContent.slice(0, 16) - use only first 16 bytes of generated padding, other data is padding for our padding
						oDataWithPadding.set(new Uint8Array(new Uint8Array(oEncryptedContent.slice(0, 16))), oArrayBuffer.byteLength);
						// decrypt data
						crypto.subtle.decrypt({ name: 'AES-CBC', iv: this.iv }, this.key, oDataWithPadding.buffer)
							.then(_.bind(function (oDecryptedArrayBuffer) {
								var oDecryptedUint8Array = new Uint8Array(oDecryptedArrayBuffer);
								// use last 16 byte of current chunk as initial vector for next chunk
								this.iv = new Uint8Array(oArrayBuffer.slice(oArrayBuffer.byteLength - 16));
								this.writeChunk(oDecryptedUint8Array);
							}, this))
							.catch(_.bind(function(err) {
								this.stopDownloading();
								Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_DECRYPTION'));
							}, this));
					}, this)
				);
			}
			else
			{ //for last chunk just decrypt data
				crypto.subtle.decrypt({ name: 'AES-CBC', iv: this.iv }, this.key, oArrayBuffer)
					.then(_.bind(function (oDecryptedArrayBuffer) {
						var oDecryptedUint8Array = new Uint8Array(oDecryptedArrayBuffer);
						// use last 16 byte of current chunk as initial vector for next chunk
						this.iv = new Uint8Array(oArrayBuffer.slice(oArrayBuffer.byteLength - 16));
						this.writeChunk(oDecryptedUint8Array);
					}, this))
					.catch(_.bind(function(err) {
						this.stopDownloading();
						Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_DECRYPTION'));
					}, this))
					;
			}
		}
	}, this);
	oReq.send(null);
};

CDownloadFile.prototype.stopDownloading = function ()
{
	this.oFile.stopDownloading();
};

/**
 * Generate link for downloading current chunk
 */
CDownloadFile.prototype.getChunkLink = function ()
{
	return this.sDownloadLink + '/download/' + this.iCurrChunk++ + '/' + this.iChunkSize;
};

CDownloadFile.prototype.isDownloading = function ()
{
	return this.oFile.downloading();
};

function CViewImage(oFile, iv, iChunkSize)
{
	this.oFile = oFile;
	this.sFileName = oFile.fileName();
	this.iFileSize = oFile.size();
	this.sDownloadLink = oFile.getActionUrl('download');
	this.oWriter = null;
	this.iCurrChunk = 0;
	this.iv = new Uint8Array(HexUtils.HexString2Array(iv));
	this.key = null;
	this.iChunkNumber = Math.ceil(this.iFileSize/iChunkSize);
	this.iChunkSize = iChunkSize;
	JscryptoKey.getKey(_.bind(function(oKey) {
		this.key = oKey;
		this.decryptChunk();
	}, this));
}
CViewImage.prototype = Object.create(CDownloadFile.prototype);
CViewImage.prototype.constructor = CViewImage;

CViewImage.prototype.writeChunk = function (oDecryptedUint8Array)
{
		this.oWriter = this.oWriter === null ? new CBlobViewer(this.sFileName) : this.oWriter;
		this.oWriter.write(oDecryptedUint8Array); //write decrypted chunk
		if (this.iCurrChunk < this.iChunkNumber)
		{ //if it was not last chunk - decrypting another chunk
			this.decryptChunk();
		}
		else
		{
			this.stopDownloading();
			this.oWriter.close();
		}
};

CDownloadFile.prototype.isDownloading = function ()
{//image download can't be aborted
	return true;
};
/**
* Writing chunks in file
* 
* @constructor
* @param {String} sFileName
* @param {Function} fProcessBlobCallback
*/
function CWriter(sFileName, fProcessBlobCallback)
{
	this.sName = sFileName;
	this.aBuffer = [];
	if (_.isFunction(fProcessBlobCallback))
	{
		this.fProcessBlobCallback = fProcessBlobCallback;
	}
}
CWriter.prototype.write = function (oDecryptedUint8Array)
{
	this.aBuffer.push(oDecryptedUint8Array);
};
CWriter.prototype.close = function ()
{
	let file = new Blob(this.aBuffer);

	if (typeof this.fProcessBlobCallback !== 'undefined')
	{
		this.fProcessBlobCallback(file);
	}
	else
	{
		FileSaver.saveAs(file, this.sName);
	}
	file = null;
};

/**
* Writing chunks in blob for viewing
* 
* @constructor
* @param {String} sFileName
*/
function CBlobViewer(sFileName) {
	this.sName = sFileName;
	this.aBuffer = [];
	this.imgWindow = window.open("", "_blank", "height=auto, width=auto,toolbar=no,scrollbars=no,resizable=yes");
}

CBlobViewer.prototype = Object.create(CWriter.prototype);
CBlobViewer.prototype.constructor = CBlobViewer;
CBlobViewer.prototype.close = function ()
{
	try
	{
		var
			file = new Blob(this.aBuffer),
			link = window.URL.createObjectURL(file),
			img = null
		;
		this.imgWindow.document.write("<head><title>" + this.sName + '</title></head><body><img src="' + link + '" /></body>');

		img = $(this.imgWindow.document.body).find('img');
		img.on('load', function () {
			//remove blob after showing image
			window.URL.revokeObjectURL(link);
		});
	}
	catch (err)
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_POPUP_WINDOWS'));
	}
};

module.exports = new  CCrypto();