'use strict';

require('modules/%ModuleName%/js/enums.js');

var
	_ = require('underscore'),

	App = require('%PathToCoreWebclientModule%/js/App.js'),
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	Crypto = null,
	Settings = require('modules/%ModuleName%/js/Settings.js'),
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	ConfirmEncryptionPopup = require('modules/%ModuleName%/js/popups/ConfirmEncryptionPopup.js'),
	ConfirmUploadPopup = require('modules/%ModuleName%/js/popups/ConfirmUploadPopup.js'),
	Browser = require('%PathToCoreWebclientModule%/js/Browser.js'),
	AwaitConfirmationQueue = [],	//List of files waiting for the user to decide on encryption
	isConfirmPopupShown = false,
	oButtonsView = null
;

function IsHttpsEnable()
{
	return window.location.protocol === "https:";
}

function ShowUploadPopup(sUid, oFileInfo, fUpload, fCancel, sErrorText)
{
	if (isConfirmPopupShown)
	{
		AwaitConfirmationQueue.push({
			sUid: sUid,
			oFileInfo: oFileInfo
		});
	}
	else
	{
		setTimeout(function () {
			Popups.showPopup(ConfirmUploadPopup, [
				fUpload,
				fCancel,
				AwaitConfirmationQueue.length,
				_.map(AwaitConfirmationQueue, function(element) {
					return element.oFileInfo.FileName; 
				}),
				sErrorText
			]);
		}, 10);
		isConfirmPopupShown = true;
		AwaitConfirmationQueue.push({
			sUid: sUid,
			oFileInfo: oFileInfo
		});
	}
}

function StartModule (ModulesManager)
{
	ModulesManager.run('SettingsWebclient', 'registerSettingsTab', [
		function () { return require('modules/%ModuleName%/js/views/ParanoidEncryptionSettingsFormView.js'); },
		Settings.HashModuleName,
		TextUtils.i18n('%MODULENAME%/LABEL_SETTINGS_TAB')
	]);

	App.subscribeEvent('AbstractFileModel::FileDownload::before', function (oParams) {
		var
			oFile = oParams.File,
			iv = 'oExtendedProps' in oFile ? ('InitializationVector' in oFile.oExtendedProps ? oFile.oExtendedProps.InitializationVector : false) : false
		;
		//User can decrypt only own files
		if (!Settings.EnableJscrypto() || !iv || oFile.sOwnerName !== App.getUserPublicId())
		{
			//regular upload will start in Jua in this case
		}
		else if (!IsHttpsEnable())
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_HTTPS_NEEDED'));
			oParams.CancelDownload = true;
		}
		else if (!Crypto.isKeyInStorage())
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY'));
			oParams.CancelDownload = true;
		}
		else
		{
			oParams.CustomDownloadHandler = function () {
				oFile.startDownloading();
				Crypto.downloadDividedFile(oFile, iv);
			};
		}
	});

	App.subscribeEvent('OpenPgpFilesWebclient::DownloadSecureFile', function (oParams) {
		var
			oFile = oParams.File,
			iv = 'oExtendedProps' in oFile ? ('InitializationVector' in oFile.oExtendedProps ? oFile.oExtendedProps.InitializationVector : false) : false,
			fProcessBlobCallback = oParams.fProcessBlobCallback
		;

		//User can decrypt only own files
		if (!Settings.EnableJscrypto() || !iv || oFile.sOwnerName !== App.getUserPublicId())
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_СANT_DECRYPT_FILE'));
		}
		else if (!IsHttpsEnable())
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_HTTPS_NEEDED'));
			oParams.CancelDownload = true;
		}
		else if (!Crypto.isKeyInStorage())
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY'));
			oParams.CancelDownload = true;
		}
		else
		{
			oFile.startDownloading();
			Crypto.downloadDividedFile(oFile, iv, fProcessBlobCallback);
		}
	});

	App.subscribeEvent('Jua::FileUpload::before', function (oParams) {
		var
			sUid = oParams.sUid,
			sModuleName = oParams.sModuleName,
			oFileInfo = oParams.oFileInfo,
			fOnChunkEncryptCallback = oParams.fOnChunkReadyCallback,
			fRegularUploadFileCallback = oParams.fRegularUploadFileCallback,
			fCancelFunction = oParams.fCancelFunction,
			fStartUploadCallback = function (oFileInfo, sUid, fOnChunkEncryptCallback) {
				if (!Settings.AllowMultiChunkUpload && oFileInfo.File.size > Crypto.iChunkSize)
				{
					Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_FILE_SIZE_LIMIT', {'VALUE': Settings.ChunkSizeMb}));
					fCancelFunction(sUid);
					Crypto.oChunkQueue.isProcessed = false;
					Crypto.checkQueue();
				}
				else
				{
					// Starts upload an encrypted file
					Crypto.startUpload(
						oFileInfo,
						sUid,
						fOnChunkEncryptCallback,
						_.bind(function () {
							fCancelFunction(sUid);
							Crypto.oChunkQueue.isProcessed = false;
							Crypto.checkQueue();
						}, this)
					);
				}
			},
			fUpload = _.bind(function () {
				AwaitConfirmationQueue.forEach(function (element) {
					fRegularUploadFileCallback(element.sUid, element.oFileInfo);
				});
				AwaitConfirmationQueue = [];
				isConfirmPopupShown = false;
			}, this),
			fEncrypt = _.bind(function () {
				AwaitConfirmationQueue.forEach(function (element) {
					// if another file is being uploaded now - add a file to the queue
					Crypto.oChunkQueue.aFiles.push({
						fStartUploadCallback: fStartUploadCallback,
						oFileInfo: element.oFileInfo,
						sUid: element.sUid,
						fOnChunkEncryptCallback: fOnChunkEncryptCallback
					});
				});
				AwaitConfirmationQueue = [];
				isConfirmPopupShown = false;
				if (!Crypto.oChunkQueue.isProcessed)
				{
					Crypto.oChunkQueue.isProcessed = true;
					Crypto.checkQueue();
				}
			}),
			fCancel = _.bind(function () {
				AwaitConfirmationQueue.forEach(function (element) {
					fCancelFunction(element.sUid);
				});
				AwaitConfirmationQueue = [];
				isConfirmPopupShown = false;
			})
		;

		if (!Settings.EnableJscrypto()
			|| (
				Settings.EncryptionAllowedModules &&
				Settings.EncryptionAllowedModules.length > 0 &&
				!Settings.EncryptionAllowedModules.includes(sModuleName)
			)
			|| (!Settings.EncryptionAllowedStorages.includes(oParams.sStorageType) && oParams.sStorageType !== 'encrypted')
			|| Settings.EncryptionMode() === Enums.EncryptionMode.Never 
			|| (Settings.EncryptionMode() === Enums.EncryptionMode.AlwaysInEncryptedFolder && oParams.sStorageType !== 'encrypted')
		)
		{
			fRegularUploadFileCallback(sUid, oFileInfo);
		}
		else if (!IsHttpsEnable())
		{
			if (Settings.EncryptionMode() === Enums.EncryptionMode.Always || Settings.EncryptionMode() === Enums.EncryptionMode.AlwaysInEncryptedFolder)
			{
				//for Always encryption mode show error
				Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_HTTPS_NEEDED'));
				fCancelFunction(sUid);
			}
			else if (Settings.EncryptionMode() === Enums.EncryptionMode.AskMe)
			{
				//for AskMe encryption mode show dialog with warning and regular upload button
				ShowUploadPopup(sUid, oFileInfo, fUpload, fCancel, TextUtils.i18n('%MODULENAME%/ERROR_HTTPS_NEEDED'));
			}
		}
		else if (!Crypto.isKeyInStorage())
		{
			if (Settings.EncryptionMode() === Enums.EncryptionMode.Always || Settings.EncryptionMode() === Enums.EncryptionMode.AlwaysInEncryptedFolder)
			{
				//for Always encryption mode show error
				Screens.showError(TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY'));
				fCancelFunction(sUid);
			}
			else if (Settings.EncryptionMode() === Enums.EncryptionMode.AskMe)
			{
				//for AskMe encryption mode show dialog with warning and regular upload button
				ShowUploadPopup(sUid, oFileInfo, fUpload, fCancel, TextUtils.i18n('%MODULENAME%/INFO_EMPTY_JSCRYPTO_KEY'));
			}
		}
		else
		{
			if (Settings.EncryptionMode() === Enums.EncryptionMode.AskMe)
			{
				if (isConfirmPopupShown)
				{
					AwaitConfirmationQueue.push({
						sUid: sUid,
						oFileInfo: oFileInfo
					});
				}
				else
				{
					setTimeout(function () {
						Popups.showPopup(ConfirmEncryptionPopup, [
							fEncrypt,
							fUpload,
							fCancel,
							AwaitConfirmationQueue.length,
							_.map(AwaitConfirmationQueue, function(element) {
								return element.oFileInfo.FileName; 
							})
						]);
					}, 10);
					isConfirmPopupShown = true;
					AwaitConfirmationQueue.push({
						sUid: sUid,
						oFileInfo: oFileInfo
					});
				}
			}
			else
			{
				if (Crypto.oChunkQueue.isProcessed === true)
				{ // if another file is being uploaded now - add a file to the queue
					Crypto.oChunkQueue.aFiles.push({
						fStartUploadCallback: fStartUploadCallback,
						oFileInfo: oFileInfo, 
						sUid: sUid, 
						fOnChunkEncryptCallback: fOnChunkEncryptCallback
					});
				}
				else
				{ // If the queue is not busy - start uploading
					fStartUploadCallback(oFileInfo, sUid, fOnChunkEncryptCallback);
				}
			}
		}
	});

	App.subscribeEvent('CFilesView::FileDownloadCancel', function (oParams) {
		if (Settings.EnableJscrypto() && IsHttpsEnable())
		{
			oParams.oFile.stopDownloading();
		}
	});

	App.subscribeEvent('CFilesView::FileUploadCancel', function (oParams) {
		if (Settings.EnableJscrypto() && IsHttpsEnable())
		{
			//clear queue
			Crypto.oChunkQueue.aFiles.forEach(function (oData, index, array) {
					oParams.fOnUploadCancelCallback(oData.sUid, oData.oFileInfo.FileName);
			});
			Crypto.oChunkQueue.aFiles = [];

			Crypto.stopUploading(oParams.sFileUploadUid , oParams.fOnUploadCancelCallback, oParams.sFileUploadName);
		}
		else if (_.isFunction(oParams.fOnUploadCancelCallback))
		{
			oParams.fOnUploadCancelCallback(oParams.sFileUploadUid, oParams.sFileUploadName);
		}
	});
	App.subscribeEvent('Jua::FileUploadingError', function () {
		if (Settings.EnableJscrypto() && IsHttpsEnable())
		{
			Crypto.oChunkQueue.isProcessed = false;
			Crypto.checkQueue();
		}
	});
	App.subscribeEvent('FilesWebclient::ParseFile::after', function (aParams) {

		var
			oFile = aParams[0],
			bIsEncrypted = typeof(oFile.oExtendedProps) !== 'undefined' &&  typeof(oFile.oExtendedProps.InitializationVector) !== 'undefined',
			iv = bIsEncrypted ? oFile.oExtendedProps.InitializationVector : false
		;

		if (bIsEncrypted)
		{
			oFile.thumbnailSrc('');
			if (oFile.sOwnerName === App.getUserPublicId() && (/\.(png|jpe?g|gif)$/).test(oFile.fileName()) && Settings.EnableJscrypto())
			{// change view action for images
				oFile.oActionsData.view.Handler = _.bind(function () {
					Crypto.viewEncryptedImage(this.oFile, this.iv);
				}, {oFile: oFile, iv: iv});
			}
			else
			{// remove view action for non-images
				oFile.removeAction('view');
			}
			oFile.removeAction('list');
			oFile.bIsSecure(true);
		}
	});
	App.subscribeEvent('FileViewerWebclientPlugin::FilesCollection::after', function (oParams) {
		oParams.aFilesCollection(_.filter(oParams.aFilesCollection(), function (oArg) {
			return !(typeof(oArg.oExtendedProps) !== 'undefined' &&  typeof(oArg.oExtendedProps.InitializationVector) !== 'undefined');
		}));
	});
}

function getButtonView()
{
	if (!oButtonsView)
	{
		oButtonsView = require('modules/%ModuleName%/js/views/ButtonsView.js');
	}

	return oButtonsView;
}

module.exports = function (oAppData) {
	Settings.init(oAppData);
	Crypto = require('modules/%ModuleName%/js/CCrypto.js');

	return {
		/**
		 * Runs before application start. Subscribes to the event before post displaying.
		 * 
		 * @param {Object} ModulesManager
		 */
		start: function (ModulesManager) {
			ModulesManager.run('FilesWebclient', 'registerToolbarButtons', [getButtonView()]);

			var bBlobSavingEnable = window.Blob && window.URL && _.isFunction(window.URL.createObjectURL);
			// Module can't work without saving blob and shouldn't be initialized.
			if (bBlobSavingEnable)
			{
				if (Browser.chrome && !IsHttpsEnable())
				{
					// Module can't work without https.0
					// Module should be initialized to display message about https enabling.
					StartModule(ModulesManager);
				}
				else if (window.crypto && window.crypto.subtle)
				{
					var sPassword = window.crypto.getRandomValues(new Uint8Array(16));
					// window.crypto can't work with PBKDF2 in Edge.
					// Checks if it works (in case if it will work in Edge one day) and then inizializes module.
					window.crypto.subtle.importKey('raw', sPassword, {name: 'PBKDF2'}, false, ['deriveBits', 'deriveKey'])
						.then(function () {
							StartModule(ModulesManager);
						});
				}
			}
		}
	};
};
